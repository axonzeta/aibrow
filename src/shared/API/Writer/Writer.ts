import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  WriterCreateOptions,
  WriterWriteOptions,
  WriterState
} from './WriterTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kWriterCompatibility,
  kWriterAvailability,
  kWriterCreate,
  kWriterDestroy,
  kWriterPrompt,
  kWriterMeasureInput
} from './WriterIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn, readablePromptStreamToString } from '../Helpers'

export class Writer extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

  static async create (options: WriterCreateOptions = {}): Promise<Writer> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kWriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: WriterState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new Writer(sessionId, options, state)
  }

  static async availability (options: WriterCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kWriterAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: WriterCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kWriterCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: WriterCreateOptions
  #state: WriterState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: WriterCreateOptions, state: WriterState) {
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
    IPCRegistrar.ipc.request(kWriterDestroy, { sessionId: this.#sessionId })
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

  get tone () { return this.#state.tone }

  get format () { return this.#state.format }

  get length () { return this.#state.length }

  get expectedInputLanguages () { return this.#state.expectedInputLanguages }

  get expectedContextLanguages () { return this.#state.expectedContextLanguages }

  get outputLanguage () { return this.#state.outputLanguage }

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

  write = async (input: string, options: WriterWriteOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.writeStreaming(input, options))
  }

  writeStreaming = (input: string, options: WriterWriteOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPCRegistrar.ipc.stream(
          kWriterPrompt,
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
            this.#state = { ...this.#state, ...(stateDelta as Partial<WriterState>) }
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  measureInputUsage = async (input: string, options: WriterWriteOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kWriterMeasureInput, { state: this.#state, input, options }, { signal })) as number
    return count
  }
}

export default Writer
