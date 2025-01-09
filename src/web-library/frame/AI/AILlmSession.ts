import {
  AIModelGpuEngine,
  AIModelDType,
  AIRootModelProps
} from '#Shared/API/AI'
import {
  AIEmbeddingVector
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import {
  kGpuEngineNotSupported,
  kModelFormatNotSupported,
  kModelIdProviderUnsupported,
  kModelPromptAborted
} from '#Shared/Errors'
import { AIModelFormat } from '#Shared/AIModelManifest'
import {
  TextStreamer,
  AutoTokenizer,
  AutoModelForCausalLM,
  InterruptableStoppingCriteria,
  PreTrainedModel,
  ProgressInfo,
  PreTrainedTokenizer,
  pipeline
} from '@huggingface/transformers'
import AsyncQueue from '#Shared/AsyncQueue'
import AIModelManager from './AIModelManager'
import AIModelId, { AIModelIdProvider } from '#Shared/AIModelId'
import deepEqual from 'fast-deep-equal'

type GetEmbeddingRequestOptions = {
  signal?: AbortSignal
}

type CountTokensRequestOptions = {
  signal?: AbortSignal
}

type ModelDownloadProgressFn = (loaded: number, total: number) => void

type AISessionOptions = {
  model: string
  gpuEngine: AIModelGpuEngine
  dtype: AIModelDType
}

type AISession = {
  id: string
  tokenizer: PreTrainedTokenizer
  model: PreTrainedModel
  options: AISessionOptions
}

type PromptStreamOptions = {
  signal?: AbortSignal
  stream: (chunk: string) => void
}

class AILlmSession {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #requestQueue: AsyncQueue
  #session: AISession // Realistically we can only support one concurrent session because of memory restraints

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#requestQueue = new AsyncQueue()
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * Throws an error if the gpu engine isn't supported
   * @param gpuEngine: the gpu engine the user is trying to use
   */
  #ensureGpuEngineSupported = (gpuEngine: AIModelGpuEngine | undefined) => {
    if (gpuEngine && !(this.getSupportedGpuEngines()).includes(gpuEngine)) {
      throw new Error(kGpuEngineNotSupported)
    }
  }

  /* **************************************************************************/
  // MARK: Platform support
  /* **************************************************************************/

  /**
   * @returns an array of supported engines
   */
  getSupportedGpuEngines (): AIModelGpuEngine[] {
    return [
      AIModelGpuEngine.Wasm,
      ...(window.navigator as any).gpu ? [AIModelGpuEngine.WebGpu] : []
    ]
  }

  /* **************************************************************************/
  // MARK: Session management
  /* **************************************************************************/

  /**
   * Destroys the current session
   * @param sessionId: the id of the session to destroy. If undefined, destroys any session
   */
  #destroySession = async (sessionId: string = undefined) => {
    if (!this.#session) { return }
    if (sessionId !== undefined && this.#session.id !== sessionId) { return }

    await this.#session.model.dispose()
    this.#session = undefined
  }

  /**
   * Creates a new session
   */
  #createSession = async (sessionId: string, props: AIRootModelProps, progressFn?: ModelDownloadProgressFn) => {
    // See if we can reuse the current session
    if (this.#session && this.#session.id === sessionId) { return }
    const options: AISessionOptions = {
      model: props.model,
      gpuEngine: props.gpuEngine,
      dtype: props.dtype
    }
    if (this.#session) {
      if (deepEqual(options, this.#session.options)) { return }
      await this.#destroySession()
    }

    // Fetch the model manifest
    const modelId = new AIModelId(props.model)
    const manifest = await AIModelManager.fetchModelManifest(modelId)
    if (!manifest.formats[AIModelFormat.ONNX]) {
      throw new Error(kModelFormatNotSupported)
    }

    let modelPath: string
    switch (modelId.provider) {
      case AIModelIdProvider.AiBrow:
        modelPath = manifest.formats[AIModelFormat.ONNX].hfId
        break
      case AIModelIdProvider.HuggingFace:
        modelPath = `${modelId.owner}/${modelId.repo}`
        break
      default:
        throw new Error(kModelIdProviderUnsupported)
    }

    // Generate the progress callbacks
    const totalProgress = new Map<string, [number, number]>()
    const progressCallback = progressFn
      ? (progress: ProgressInfo) => {
          switch (progress.status) {
            case 'progress': {
              totalProgress.set(progress.file, [progress.loaded, progress.total])
              let loaded = 0
              let total = 0
              for (const [l, t] of totalProgress.values()) {
                loaded += l
                total += t
              }
              progressFn(loaded, total)
              break
            }
          }
        }
      : undefined

    // Create the tokenizer and model
    const tokenizer = await AutoTokenizer.from_pretrained(modelPath, {
      progress_callback: progressCallback
    })
    const model = await AutoModelForCausalLM.from_pretrained(modelPath, {
      dtype: props.dtype ?? AIModelDType.Auto,
      device: props.gpuEngine === AIModelGpuEngine.WebGpu ? 'webgpu' : 'wasm',
      progress_callback: progressCallback
    })

    if (this.#session) {
      throw new Error('Session already exists')
    }
    this.#session = { id: sessionId, tokenizer, model, options }
  }

  /* **************************************************************************/
  // MARK: Prompt session
  /* **************************************************************************/

  /**
   * Creates a new prompt session
   * @param sessionId: the id of the session
   * @param props: the prompt model props
   * @param progressFn: the progress function
   * @returns
   */
  async createPromptSession (sessionId: string, props: AIRootModelProps, progressFn?: ModelDownloadProgressFn) {
    this.#ensureGpuEngineSupported(props.gpuEngine)
    return this.#requestQueue.push(async () => {
      await this.#createSession(sessionId, props, progressFn)
    })
  }

  /**
   * Destroys a prompt session
   * @param sessionId: the id of the session
   * @returns
   */
  async disposeSession (sessionId: string) {
    return this.#requestQueue.push(async () => {
      await this.#destroySession(sessionId)
    })
  }

  /**
   * Adds a new language model prompt to the queue
   * @param sessionId: the id of the session
   * @param prompt: the prompt to execute
   * @param props: the prompt model props
   * @param streamOptions: the options for the return stream
   */
  async prompt (sessionId: string, prompt: string, props: AIRootModelProps, streamOptions: PromptStreamOptions) {
    this.#ensureGpuEngineSupported(props.gpuEngine)
    return this.#requestQueue.push(async () => {
      if (streamOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }
      await this.#createSession(sessionId, props)
      if (streamOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }

      // Create text streamer and prompt
      let buff = ''
      const streamer = new TextStreamer(this.#session.tokenizer, {
        skip_prompt: true,
        callback_function: (text) => {
          streamOptions.stream(text)
          buff += text
        }
      })

      // Tokenize the input and generate
      const inputs = this.#session.tokenizer([prompt], { return_tensors: 'pt' })
      await this.#session.model.generate({
        ...inputs,
        do_sample: true,
        top_k: props.topK,
        top_p: props.topP,
        temperature: props.temperature,
        repeatPenalty: props.repeatPenalty,
        max_new_tokens: props.contextSize,
        streamer,
        stopping_criteria: new InterruptableStoppingCriteria(),
        return_dict_in_generate: true
      }) as any

      return buff
    })
  }

  /**
   * Adds a new embedding request to the queue
   * @param sessionId: the id of the session
   * @param inputs: the input to generate the embedding for
   * @param props: the prompt model options
   * @param requestOptions: the requestOptions
   * @return the embedding vector
   */
  async getEmbeddingVectors (sessionId: string, inputs: string[], props: AIRootModelProps, requestOptions: GetEmbeddingRequestOptions) {
    this.#ensureGpuEngineSupported(props.gpuEngine)

    return this.#requestQueue.push(async () => {
      if (requestOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }
      await this.#createSession(sessionId, props)
      if (requestOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }

      const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

      const result: AIEmbeddingVector[] = []
      for (const input of inputs) {
        const res = await pipe(input, { pooling: 'mean', normalize: true })
        result.push(Array.from(res.data))
      }

      return result
    }) as Promise<AIEmbeddingVector[]>
  }

  /* **************************************************************************/
  // MARK: Tokenizer
  /* **************************************************************************/

  /**
   * Counts the tokens in a string
   * @param sessionId: the current session id
   * @param input: the input string
   * @param props: the model props
   * @param requestOptions: the request options
   * @return the token count
   */
  async countTokens (sessionId: string, input: string, props: AIRootModelProps, requestOptions: CountTokensRequestOptions) {
    this.#ensureGpuEngineSupported(props.gpuEngine)
    this.#ensureGpuEngineSupported(props.gpuEngine)
    return this.#requestQueue.push(async () => {
      if (requestOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }
      await this.#createSession(sessionId, props)
      if (requestOptions.signal?.aborted) { throw new Error(kModelPromptAborted) }
      return this.#session.tokenizer.tokenize(input).length
    }) as Promise<number>
  }
}

export default new AILlmSession()
