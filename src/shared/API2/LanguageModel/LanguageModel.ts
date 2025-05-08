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
  LanguageModelAppendOptions
} from './LanguageModelTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kLanguageModelCompatibility,
  kLanguageModelAvailability,
  kLanguageModelParams
} from './LanguageModelIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'

export class LanguageModel extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: LanguageModelCreateOptions = {}): Promise<LanguageModel> {
    throw new Error("Not implemented")
    /*const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kLanguageModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AILanguageModelData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AILanguageModel(this.#ipc, data, options.signal)*/
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

  #options: LanguageModelCreateOptions
  //#state: AILanguageModelState
  #signal: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (options: LanguageModelCreateOptions) {
    super()
    this.#options = options
  }

  clone = async (options: LanguageModelCloneOptions = {}): Promise<LanguageModel> => {
    throw new Error("Not implemented")
  }

  destroy = () => {

  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get topK () { throw new Error("Not implemented") }

  get temperature () { throw new Error("Not implemented") }

  get gpuEngine () { throw new Error("Not implemented") }

  get dtype () { throw new Error("Not implemented") }

  get flashAttention () { throw new Error("Not implemented") }

  get contextSize () { throw new Error("Not implemented") }

  /* **************************************************************************/
  // MARK: Properties: Usage
  /* **************************************************************************/

  get inputUsage () { throw new Error("Not implemented") }

  get inputQuota () { throw new Error("Not implemented") }

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
