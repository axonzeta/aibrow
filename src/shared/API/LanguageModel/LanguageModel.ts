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
  LanguageModelState,
  LanguageModelPrompt,
  languageModelPromptToMessages
} from './LanguageModelTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kLanguageModelCompatibility,
  kLanguageModelAvailability,
  kLanguageModelParams,
  kLanguageModelCreate,
  kLanguageModelDestroy,
  kLanguageModelPrompt,
  kLanguageModelMeasureInput
} from './LanguageModelIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn, readablePromptStreamToString } from '../Helpers'

export class LanguageModel extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

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
    this.#guardDestroyed()

    const {
      signal: parentSignal,
      ...passOptions
    } = this.#options
    const signal = AbortSignal.any([options.signal, parentSignal].filter((s): s is AbortSignal => s !== undefined))

    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(
        kLanguageModelCreate,
        passOptions,
        { signal })
    ) as { sessionId: string, state: LanguageModelState }

    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new LanguageModel(sessionId, options, state)
  }

  destroy = () => {
    this.#destroyed = true
    IPCRegistrar.ipc.request(kLanguageModelDestroy, { sessionId: this.#sessionId })
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get topK () { return this.#state.topK }

  get topP () { return this.#state.topP }

  get repeatPenalty () { return this.#state.repeatPenalty }

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

  /* **************************************************************************/
  // MARK: Prompting/chat
  /* **************************************************************************/

  prompt = async (input: LanguageModelPrompt, options: LanguageModelPromptOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.promptStreaming(input, options))
  }

  promptStreaming = (input: LanguageModelPrompt, options: LanguageModelPromptOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    this.#state.messages.push(...languageModelPromptToMessages(input))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPCRegistrar.ipc.stream(
          kLanguageModelPrompt,
          {
            sessionId: this.#sessionId,
            state: this.#state,
            options: { responseConstraint: options.responseConstraint }
          },
          (chunk: string) => {
            buffer += chunk
            controller.enqueue(buffer)
          },
          { signal }
        ).then(
          (stateDelta: unknown) => {
            this.#state = { ...this.#state, ...(stateDelta as Partial<LanguageModelState>) }
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  append = async (input: string, _options: LanguageModelAppendOptions = {}): Promise<void> => {
    this.#guardDestroyed()
    this.#state.messages.push(...languageModelPromptToMessages(input))
  }

  measureInputUsage = async (input: string, options: LanguageModelPromptOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kLanguageModelMeasureInput, { input, state: this.#state }, { signal })) as number
    return count
  }
}

export default LanguageModel
