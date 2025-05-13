import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  LanguageDetectorCreateOptions,
  LanguageDetectorDetectOptions,
  LanguageDetectorState,
  LanguageDetectorDetectionResult
} from './LanguageDetectorTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kLanguageDetectorCompatibility,
  kLanguageDetectorAvailability,
  kLanguageDetectorCreate,
  kLanguageDetectorDestroy,
  kLanguageDetectorPrompt,
  kLanguageDetectorMeasureInput
} from './LanguageDetectorIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn } from '../Helpers'

export class LanguageDetector extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: LanguageDetectorCreateOptions = {}): Promise<LanguageDetector> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kLanguageDetectorCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: LanguageDetectorState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new LanguageDetector(sessionId, options, state)
  }

  static async availability (options: LanguageDetectorCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kLanguageDetectorAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: LanguageDetectorCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kLanguageDetectorCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: LanguageDetectorCreateOptions
  #state: LanguageDetectorState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: LanguageDetectorCreateOptions, state: LanguageDetectorState) {
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
    IPCRegistrar.ipc.request(kLanguageDetectorDestroy, { sessionId: this.#sessionId })
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get expectedInputLanguages () { return this.#state.expectedInputLanguages }

  get gpuEngine () { return this.#state.gpuEngine }

  get dtype () { return this.#state.dtype }

  get flashAttention () { return this.#state.flashAttention }

  get contextSize () { return this.#state.contextSize }

  /* **************************************************************************/
  // MARK: Properties: Usage
  /* **************************************************************************/

  get inputQuota () { return this.#state.inputQuota }

  /* **************************************************************************/
  // MARK: Language Detection
  /* **************************************************************************/

  detect = async (input: string, options: LanguageDetectorDetectOptions = {}): Promise<LanguageDetectorDetectionResult[]> => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const result = (await IPCRegistrar.ipc.request(kLanguageDetectorPrompt, {
      sessionId: this.#sessionId,
      state: this.#state,
      input,
      options
    }, { signal })) as LanguageDetectorDetectionResult[]
    return result
  }

  measureInputUsage = async (input: string, options: LanguageDetectorDetectOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kLanguageDetectorMeasureInput, { state: this.#state, input, options }, { signal })) as number
    return count
  }
}

export default LanguageDetector
