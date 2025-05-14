import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  SummarizerCreateOptions,
  SummarizerSummarizeOptions,
  SummarizerState
} from './SummarizerTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kSummarizerCompatibility,
  kSummarizerAvailability,
  kSummarizerCreate,
  kSummarizerDestroy,
  kSummarizerPrompt,
  kSummarizerMeasureInput
} from './SummarizerIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn, readablePromptStreamToString } from '../Helpers'

export class Summarizer extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

  static async create (options: SummarizerCreateOptions = {}): Promise<Summarizer> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kSummarizerCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: SummarizerState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new Summarizer(sessionId, options, state)
  }

  static async availability (options: SummarizerCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kSummarizerAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: SummarizerCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kSummarizerCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: SummarizerCreateOptions
  #state: SummarizerState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: SummarizerCreateOptions, state: SummarizerState) {
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
    IPCRegistrar.ipc.request(kSummarizerDestroy, { sessionId: this.#sessionId })
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get sharedContext () { return this.#state.sharedContext }

  get type () { return this.#state.type }

  get format () { return this.#state.format }

  get length () { return this.#state.length }

  get expectedInputLanguages () { return this.#state.expectedInputLanguages } //TODO impl

  get expectedContextLanguages () { return this.#state.expectedContextLanguages } //TODO impl

  get outputLanguage () { return this.#state.outputLanguage } //TODO impl

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

  summarize = async (input: string, options: SummarizerSummarizeOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.summarizeStreaming(input, options))
  }

  summarizeStreaming = (input: string, options: SummarizerSummarizeOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPCRegistrar.ipc.stream(
          kSummarizerPrompt,
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
            this.#state = { ...this.#state, ...(stateDelta as Partial<SummarizerState>) }
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  measureInputUsage = async (input: string, options: SummarizerSummarizeOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kSummarizerMeasureInput, { state: this.#state, input, options }, { signal })) as number
    return count
  }
}

export default Summarizer
