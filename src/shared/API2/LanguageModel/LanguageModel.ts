import {
  AIModelAvailability,
  AICoreModel,
  AIModelCoreCompatibility
} from '../AICoreTypes'
import {
  LanguageModelCreateOptions,
  LanguageModelParams,
  LanguageModelCloneOptions,
  LanguageModelPromptOptions,
  LanguageModelAppendOptions,
  LanguageModelState
} from './LanguageModelTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kLanguageModelCompatibility,
  kLanguageModelAvailability,
  kLanguageModelParams,
  kLanguageModelCreate,
  kLanguageModelDestroy
} from './LanguageModelIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import { kModelCreationAborted } from '../../Errors'
import { createDownloadProgressFn } from '../Helpers'

export class LanguageModel extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: LanguageModelCreateOptions = {}): Promise<LanguageModel> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kLanguageModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: LanguageModelState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new LanguageModel(sessionId, options, state)
  }

  static async availability (options: LanguageModelCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kLanguageModelAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: LanguageModelCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kLanguageModelCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  static async params (): Promise<LanguageModelParams | null> {
    const params = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kLanguageModelParams, {})
    ) as LanguageModelParams | null
    return params
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: LanguageModelCreateOptions
  #state: LanguageModelState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: LanguageModelCreateOptions, state: LanguageModelState) {
    super()
    this.#sessionId = sessionId
    this.#options = { ...options }
    this.#state = state

    if (this.#options.signal) {
      this.#options.signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: LanguageModelCloneOptions = {}): Promise<LanguageModel> => {
    throw new Error("Not implemented")
  }

  destroy = () => {
    this.#destroyed = true
    IPCRegistrar.ipc.request(kLanguageModelDestroy, { sessionId: this.#sessionId })
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get topK () { return this.#state.topK }

  get temperature () { return this.#state.temperature }

  get gpuEngine () { return this.#state.gpuEngine }

  get dtype () { return this.#state.dtype }

  get flashAttention () { return this.#state.flashAttention }

  get contextSize () { return this.#state.contextSize }

  /* **************************************************************************/
  // MARK: Properties: Usage
  /* **************************************************************************/

  get inputUsage () { return this.#state.inputUsage }

  get inputQuota () { return this.#state.inputQuota }

  set onquotaoverflow (value) { throw new Error("Not implemented") }

  get onquotaoverflow () { throw new Error("Not implemented") }

  /* **************************************************************************/
  // MARK: Prompting/chat
  /* **************************************************************************/

  prompt = async (input: string, options: LanguageModelPromptOptions = {}): Promise<string> => {
    throw new Error("Not implemented")
  }

  promptStreaming = async (input: string, options: LanguageModelPromptOptions = {}): Promise<ReadableStream> => {
    throw new Error("Not implemented")
  }

  append = async (input: string, options: LanguageModelAppendOptions = {}): Promise<void> => {
    throw new Error("Not implemented")
  }

  measureInputUsage = async (input: string, options: LanguageModelPromptOptions = {}): Promise<number> => {
    throw new Error("Not implemented")
  }
}

export default LanguageModel
