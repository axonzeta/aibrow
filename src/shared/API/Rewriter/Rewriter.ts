import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  RewriterCreateOptions,
  RewriterWriteOptions,
  RewriterState
} from './RewriterTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kRewriterCompatibility,
  kRewriterAvailability,
  kRewriterCreate,
  kRewriterDestroy,
  kRewriterPrompt,
  kRewriterMeasureInput
} from './RewriterIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn, readablePromptStreamToString } from '../Helpers'

export class Rewriter extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

  static async create (options: RewriterCreateOptions = {}): Promise<Rewriter> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kRewriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: RewriterState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new Rewriter(sessionId, options, state)
  }

  static async availability (options: RewriterCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kRewriterAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: RewriterCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kRewriterCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: RewriterCreateOptions
  #state: RewriterState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: RewriterCreateOptions, state: RewriterState) {
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
    IPCRegistrar.ipc.request(kRewriterDestroy, { sessionId: this.#sessionId })
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

  rewrite = async (input: string, options: RewriterWriteOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.rewriteStreaming(input, options))
  }

  rewriteStreaming = (input: string, options: RewriterWriteOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    return new ReadableStream({
      start: (controller) => {
        IPCRegistrar.ipc.stream(
          kRewriterPrompt,
          {
            sessionId: this.#sessionId,
            state: this.#state,
            input,
            options
          },
          (chunk: string) => {
            controller.enqueue(chunk)
          },
          { signal }
        ).then(
          (stateDelta: unknown) => {
            this.#state = { ...this.#state, ...(stateDelta as Partial<RewriterState>) }
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  measureInputUsage = async (input: string, options: RewriterWriteOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))
    const count = (await IPCRegistrar.ipc.request(kRewriterMeasureInput, { state: this.#state, input, options }, { signal })) as number
    return count
  }
}

export default Rewriter
