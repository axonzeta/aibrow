import { AICapabilityGpuEngine } from '#Shared/API/AI'
import NativeIPC from '../NativeIPC'
import {
  kPrompterGetSupportedGpuEngines,
  kPrompterExecPromptSession,
  kPrompterDisposePromptSession,

  PromptOptions
} from '#Shared/NativeAPI/PrompterIPC'
import { AIModelTokenCountMethod } from '#Shared/AIModelManifest'
import { kGpuEngineNotSupported } from '#Shared/Errors'

type SupportedEngines = {
  engines: AICapabilityGpuEngine[] | undefined
  resolving: boolean
  callbacks: Array<(engines: AICapabilityGpuEngine[]) => void>
}

type PromptStreamOptions = {
  signal?: AbortSignal
  stream: (chunk: string) => void
}

type PromptQueue = {
  inflight: boolean
  queue: Array<{
    options: PromptOptions
    streamOptions: PromptStreamOptions
    resolve: (value: unknown) => void
    reject: (ex: Error) => void
  }>
}

class AIPrompter {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #supportedEngines: SupportedEngines
  #promptQueue: PromptQueue = { inflight: false, queue: [] }

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
   * @param options: the prompt options
   * @param streamOptions: the options for the return stream
   */
  async prompt (options: PromptOptions, streamOptions: PromptStreamOptions) {
    if (options.gpuEngine && !(await this.getSupportedGpuEngines()).includes(options.gpuEngine)) {
      throw new Error(kGpuEngineNotSupported)
    }

    return new Promise((resolve, reject) => {
      this.#promptQueue.queue.push({
        options,
        streamOptions,
        resolve,
        reject
      })
      setTimeout(this.#drainPromptQueue, 1)
    })
  }

  /**
   * Drains the next item in the prompt queue and executes it
   */
  #drainPromptQueue = async () => {
    if (this.#promptQueue.inflight) { return }
    if (this.#promptQueue.queue.length === 0) { return }

    this.#promptQueue.inflight = true
    const { options, streamOptions, resolve, reject } = this.#promptQueue.queue.pop()
    try {
      const res = await NativeIPC.stream(
        kPrompterExecPromptSession,
        options,
        (chunk: string) => streamOptions.stream(chunk),
        { signal: streamOptions.signal }
      )
      resolve(res)
    } catch (ex) {
      reject(ex)
    } finally {
      this.#promptQueue.inflight = false
      setTimeout(this.#drainPromptQueue, 1)
    }
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
   * @param input: the string to count the tokens from
   * @param method: the method to use for counting
   * @return the token count
   */
  async countTokens (input: string, method: AIModelTokenCountMethod | AIModelTokenCountMethod[]) {
    for (const m of Array.isArray(method) ? method : [method]) {
      switch (m) {
        case AIModelTokenCountMethod.Divide4:
          return Math.ceil(input.length / 4)
      }
    }

    console.warn('Unknown token count method, defaulting to Divide4:', method)
    return Math.ceil(input.length / 4)
  }
}

export default new AIPrompter()
