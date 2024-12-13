import { AICapabilityGpuEngine, AIRootModelProps } from '#Shared/API/AI'
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
  AIEmbeddingVector
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import { kGpuEngineNotSupported } from '#Shared/Errors'
import { AIModelFormat, AIModelManifest } from '#Shared/AIModelManifest'

type SupportedEngines = {
  engines: AICapabilityGpuEngine[] | undefined
  resolving: boolean
  callbacks: Array<(engines: AICapabilityGpuEngine[]) => void>
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
  #ensureGpuEngineSupported = async (gpuEngine: AICapabilityGpuEngine | undefined) => {
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
  async getSupportedGpuEngines (): Promise<AICapabilityGpuEngine[]> {
    if (this.#supportedEngines.engines) { return this.#supportedEngines.engines }

    if (!this.#supportedEngines.resolving) {
      this.#supportedEngines.resolving = true
      ;(async () => {
        const supportedEngines = (await NativeIPC.request(kLlmSessionGetSupportedGpuEngines, {})) as AICapabilityGpuEngine[]
        const callbacks = this.#supportedEngines.callbacks
        this.#supportedEngines.engines = supportedEngines
        this.#supportedEngines.resolving = false
        this.#supportedEngines.callbacks = []

        for (const cb of callbacks) {
          cb(this.#supportedEngines.engines)
        }
      })()
    }

    return new Promise<AICapabilityGpuEngine[]>((resolve) => {
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
  async prompt (sessionId: string, prompt: string, props: AIRootModelProps, streamOptions: PromptStreamOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

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
  async getEmbeddingVectors (sessionId: string, inputs: string[], props: AIRootModelProps, requestOptions: GetEmbeddingRequestOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

    const res: AIEmbeddingVector[] = []
    await NativeIPC.stream(
      kLlmSessionGetEmbeddingVectors,
      { inputs, props },
      (chunk: AIEmbeddingVector) => { res.push(chunk) },
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
  async countTokens (input: string, props: AIRootModelProps, requestOptions: CountTokensRequestOptions) {
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
