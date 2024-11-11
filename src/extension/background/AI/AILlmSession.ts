import { AICapabilityGpuEngine, AIRootModelProps } from '#Shared/API/AI'
import NativeIPC from '../NativeIPC'
import {
  kLlmSessionGetSupportedGpuEngines,
  kLlmSessionGetModelScore,
  kLlmSessionExecPromptSession,
  kLlmSessionGetEmbeddingVector,
  kLlmSessionCountPromptTokens,
  kLlmSessionDisposePromptSession
} from '#Shared/NativeAPI/LlmSessionIPC'
import { kGpuEngineNotSupported } from '#Shared/Errors'
import { AIModelManifest } from '#Shared/AIModelManifest'

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
    const score = (await NativeIPC.request(kLlmSessionGetModelScore, {
      gpuEngine: undefined,
      flashAttention: manifest.config.flashAttention,
      contextSize: manifest.tokens.max,
      modelUrl: manifest.assets.find((asset) => asset.id === manifest.model)?.url
    })) as number
    return score
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
   * @param input: the input to generate the embedding for
   * @param props: the prompt model options
   * @param requestOptions: the requestOptions
   * @return the embedding vector
   */
  async getEmbeddingVector (sessionId: string, input: string, props: AIRootModelProps, requestOptions: GetEmbeddingRequestOptions) {
    await this.#ensureGpuEngineSupported(props.gpuEngine)

    const res = await NativeIPC.request(
      kLlmSessionGetEmbeddingVector,
      { input, props },
      { signal: requestOptions.signal }
    )
    return res as number[]
  }

  /**
   * Disposes a prompt session freeing its memory
   * @param sessionId: the id of the session
   */
  async disposePromptSession (sessionId: string) {
    await NativeIPC.request(kLlmSessionDisposePromptSession, { sessionId })
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
