import {
  AIRewriterRewriteOptions,
  AIRewriterData,
  AIRewriterProps,
  AIRewriterCloneOptions
} from '#Shared/API/AIRewriter/AIRewriterTypes'
import IPC from '../IPC'
import { kRewriterCreate, kRewriterRewrite } from '#Shared/API/AIRewriter/AIRewriterIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'

class AIRewriter extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AIRewriterProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIRewriterData, signal?: AbortSignal) {
    super(data.props)
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AIRewriterCloneOptions = {}): Promise<AIRewriter> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kRewriterCreate, this.#props, { signal })) as AIRewriterData
    const session = new AIRewriter(data)
    return session
  }

  destroy = () => {
    this.#destroyed = true
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get sharedContext () { return this.#props.sharedContext }

  get tone () { return this.#props.tone }

  get format () { return this.#props.format }

  get length () { return this.#props.length }

  /* **************************************************************************/
  // MARK: Summarizing
  /* **************************************************************************/

  rewrite = async (input: string, options: AIRewriterRewriteOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.rewriteStreaming(input, options))
  }

  rewriteStreaming = (input: string, options: AIRewriterRewriteOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPC.stream(
          kRewriterRewrite,
          {
            sessionId: this.#sessionId,
            props: this.#props,
            context: options.context,
            input
          },
          (chunk: string) => {
            buffer += chunk
            controller.enqueue(buffer)
          },
          { signal }
        ).then(
          () => controller.close(),
          (ex: Error) => controller.error(ex)
        )
      }
    })
  }
}

export default AIRewriter
