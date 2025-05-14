import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  TranslatorCreateOptions,
  TranslatorTranslateOptions,
  TranslatorState
} from './TranslatorTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kTranslatorCompatibility,
  kTranslatorAvailability,
  kTranslatorCreate,
  kTranslatorDestroy,
  kTranslatorPrompt,
  kTranslatorMeasureInput
} from './TranslatorIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn, readablePromptStreamToString } from '../Helpers'

export class Translator extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

  static async create (options: TranslatorCreateOptions): Promise<Translator> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kTranslatorCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: TranslatorState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new Translator(sessionId, options, state)
  }

  static async availability (options: TranslatorCreateOptions): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kTranslatorAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: TranslatorCreateOptions): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kTranslatorCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: TranslatorCreateOptions
  #state: TranslatorState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: TranslatorCreateOptions, state: TranslatorState) {
    super()
    this.#sessionId = sessionId
    this.#options = { ...options }
    this.#state = state

    if (this.#options.signal) {
      this.#options.signal.addEventListener('abort', () => this.destroy())
    }
  }

  destroy = () => {
    this.#destroyed = true
    IPCRegistrar.ipc.request(kTranslatorDestroy, { sessionId: this.#sessionId })
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get sourceLanguage () { return this.#state.sourceLanguage }

  get targetLanguage () { return this.#state.targetLanguage }

  get gpuEngine () { return this.#state.gpuEngine }

  get dtype () { return this.#state.dtype }

  get flashAttention () { return this.#state.flashAttention }

  get contextSize () { return this.#state.contextSize }

  /* **************************************************************************/
  // MARK: Properties: Usage
  /* **************************************************************************/

  get inputQuota () { return this.#state.inputQuota }

  /* **************************************************************************/
  // MARK: Prompting/chat
  /* **************************************************************************/

  translate = async (input: string, options: TranslatorTranslateOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.translateStreaming(input, options))
  }

  translateStreaming = (input: string, options: TranslatorTranslateOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPCRegistrar.ipc.stream(
          kTranslatorPrompt,
          {
            sessionId: this.#sessionId,
            state: this.#state,
            input,
            options
          },
          (chunk: string) => {
            buffer += chunk
            controller.enqueue(buffer)
          },
          { signal }
        ).then(
          (stateDelta: unknown) => {
            this.#state = { ...this.#state, ...(stateDelta as Partial<TranslatorState>) }
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  measureInputUsage = async (input: string, options: TranslatorTranslateOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kTranslatorMeasureInput, { state: this.#state, input, options }, { signal })) as number
    return count
  }
}

export default Translator
