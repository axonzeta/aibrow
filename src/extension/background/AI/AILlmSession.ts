import { AIModelGpuEngine, AIModelPromptProps } from '#Shared/API/AICoreTypes'
import NativeIPC from '../NativeIPC'
import {
  kLlmSessionGetSupportedGpuEngines,
  kLlmSessionGetModelScore,
  kLlmSessionExecPromptSession,
  kLlmSessionGetEmbeddingVectors,
  kLlmSessionCountPromptTokens,
  kLlmSessionDisposeSession
} from '#Shared/NativeAPI/LlmSessionIPC'
import {
  EmbeddingVector
} from '#Shared/API/Embedding/EmbeddingTypes'
import { kGpuEngineNotSupported } from '#Shared/Errors'
import { AIModelFormat, AIModelManifest } from '#Shared/AIModelManifest'
import config from '#Shared/Config'

type SupportedEngines = {
  engines: AIModelGpuEngine[] | undefined
  resolving: boolean
  callbacks: Array<(engines: AIModelGpuEngine[]) => void>
}

type GetEmbeddingRequestOptions = {
  signal?: AbortSignal
}

type CountTokensRequestOptions = {
  signal?: AbortSignal
}

type PromptStreamOptions = {
  signal?: AbortSignal
  stream: (chunk: string) => void
}

class AILlmSession {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #supportedEngines: SupportedEngines

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#supportedEngines = { engines: undefined, resolving: false, callbacks: [] }
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * Throws an error if the gpu engine isn't supported
   * @param gpuEngine: the gpu engine the user is trying to use
   */
  #ensureGpuEngineSupported = async (gpuEngine: AIModelGpuEngine | undefined) => {
    if (gpuEngine && !(await this.getSupportedGpuEngines()).includes(gpuEngine)) {
      throw new Error(kGpuEngineNotSupported)
    }
  }

  /* **************************************************************************/
  // MARK: Platform support
  /* **************************************************************************/

  /**
   * @returns an array of supported engines
   */
  async getSupportedGpuEngines (): Promise<AIModelGpuEngine[]> {
    if (this.#supportedEngines.engines) { return this.#supportedEngines.engines }

    if (!this.#supportedEngines.resolving) {
      this.#supportedEngines.resolving = true
      ;(async () => {
        const supportedEngines = (await NativeIPC.request(kLlmSessionGetSupportedGpuEngines, {})) as AIModelGpuEngine[]
        const callbacks = this.#supportedEngines.callbacks
        this.#supportedEngines.engines = supportedEngines
        this.#supportedEngines.resolving = false
        this.#supportedEngines.callbacks = []

        for (const cb of callbacks) {
          cb(this.#supportedEngines.engines)
        }
      })()
    }

    return new Promise<AIModelGpuEngine[]>((resolve) => {
      this.#supportedEngines.callbacks.push(resolve)
    })
  }

  /**
   * @returns the model score for this machine
   */
  async getModelScore (manifest: AIModelManifest) : Promise<number> {
    if (manifest.formats[AIModelFormat.GGUF]) {
      const format = manifest.formats[AIModelFormat.GGUF]
      const score = (await NativeIPC.request(kLlmSessionGetModelScore, {
        gpuEngine: undefined,
        flashAttention: manifest.config.flashAttention,
        contextSize: manifest.tokens.max,
        modelUrl: format.assets.find((asset) => asset.id === format.model)?.url
      })) as number
      return score
    } else {
      return 0
    }
  }

  /* **************************************************************************/
  // MARK: Prompt session
  /* **************************************************************************/

  /**
   * Adds a new language model prompt to the queue
   * @param sessionId: the id of the session
   * @param prompt: the prompt to execute
   * @param props: the prompt model props
   * @param streamOptions: the options for the return stream
   */
  async prompt (sessionId: string, prompt: string, props: Partial<AIModelPromptProps>, streamOptions: PromptStreamOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

    if (process.env.BROWSER === 'moz' && config.extension.experimentalFirefoxAi) {
      console.log(">>> Run")
      console.log(sessionId, prompt, props, streamOptions)

      const ln = (data) => {
        console.log("Progress:", data)
      }
      globalThis.browser.trial.ml.onProgress.addListener(ln)

      try {
        await globalThis.browser.trial.ml.createEngine({
          modelHub: "huggingface",
          taskName: "text-generation",
          modelId: "onnx-community/Qwen2.5-1.5B-Instruct"//"onnx-community/Qwen2.5-0.5B-Instruct"// "Xenova/Qwen1.5-0.5B"// "Xenova/Qwen1.5-0.5B-Chat"
        })
      } catch (ex) {
        console.error("EX1", ex)
        throw ex
      } finally {
        globalThis.browser.trial.ml.onProgress.removeListener(ln)
      }

      try {
        const res = await globalThis.browser.trial.ml.runEngine({
          args: [prompt],
          max_new_tokens: 1024
        })
        console.log(">>>OUT", res)
        streamOptions.stream(res[0].generated_text)
        return
      } catch (ex) {
        console.error("EX2", ex)
        throw ex
      }
    }

    const res = await NativeIPC.stream(
      kLlmSessionExecPromptSession,
      { props, prompt, sessionId },
      (chunk: string) => streamOptions.stream(chunk),
      { signal: streamOptions.signal }
    )
    return res
  }

  /**
   * Adds a new embedding request to the queue
   * @param sessionId: the id of the session
   * @param inputs: the input to generate the embedding for
   * @param props: the prompt model options
   * @param requestOptions: the requestOptions
   * @return the embedding vector
   */
  async getEmbeddingVectors (sessionId: string, inputs: string[], props: Partial<AIModelPromptProps>, requestOptions: GetEmbeddingRequestOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

    const res: EmbeddingVector[] = []
    await NativeIPC.stream(
      kLlmSessionGetEmbeddingVectors,
      { inputs, props },
      (chunk: EmbeddingVector) => { res.push(chunk) },
      { signal: requestOptions.signal }
    )

    return res
  }

  /**
   * Disposes a prompt session freeing its memory
   * @param sessionId: the id of the session
   */
  async disposeSession (sessionId: string) {
    await NativeIPC.request(kLlmSessionDisposeSession, { sessionId })
  }

  /* **************************************************************************/
  // MARK: Tokenizer
  /* **************************************************************************/

  /**
   * Counts the tokens in a string
   * @param input: the input string
   * @param props: the model props
   * @param requestOptions: the request options
   * @return the token count
   */
  async countTokens (input: string, props: Partial<AIModelPromptProps>, requestOptions: CountTokensRequestOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

    const res = await NativeIPC.request(
      kLlmSessionCountPromptTokens,
      { input, props },
      { signal: requestOptions.signal }
    )
    return res as number
  }
}

export default new AILlmSession()
