import { AICapabilityGpuEngine, AIRootModelProps } from '#Shared/API/AI'
import NativeIPC from '../NativeIPC'
import {
  kPrompterGetSupportedGpuEngines,
  kPrompterExecPromptSession,
  kPrompterCountPromptTokens,
  kPrompterDisposePromptSession
} from '#Shared/NativeAPI/PrompterIPC'
import { kGpuEngineNotSupported } from '#Shared/Errors'

type SupportedEngines = {
  engines: AICapabilityGpuEngine[] | undefined
  resolving: boolean
  callbacks: Array<(engines: AICapabilityGpuEngine[]) => void>
}

type CountTokensRequestOptions = {
  signal?: AbortSignal
}

type PromptStreamOptions = {
  signal?: AbortSignal
  stream: (chunk: string) => void
}

class AIPrompter {
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
        const supportedEngines = (await NativeIPC.request(kPrompterGetSupportedGpuEngines, {})) as AICapabilityGpuEngine[]
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
    if (props.gpuEngine && !(await this.getSupportedGpuEngines()).includes(props.gpuEngine)) {
      throw new Error(kGpuEngineNotSupported)
    }

    const res = await NativeIPC.stream(
      kPrompterExecPromptSession,
      { props, prompt, sessionId },
      (chunk: string) => streamOptions.stream(chunk),
      { signal: streamOptions.signal }
    )
    return res
  }

  /**
   * Disposes a prompt session freeing its memory
   * @param sessionId: the id of the session
   */
  async disposePromptSession (sessionId: string) {
    await NativeIPC.request(kPrompterDisposePromptSession, { sessionId })
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
    if (props.gpuEngine && !(await this.getSupportedGpuEngines()).includes(props.gpuEngine)) {
      throw new Error(kGpuEngineNotSupported)
    }

    const res = await NativeIPC.request(
      kPrompterCountPromptTokens,
      { input, props },
      { signal: requestOptions.signal }
    )
    return res
  }
}

export default new AIPrompter()
