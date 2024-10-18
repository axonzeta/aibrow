import {
  AISummarizerData,
  AISummarizerProps,
  AISummarizerCloneOptions,
  AISummarizerSummarizeOptions
} from '#Shared/API/AISummarizer/AISummarizerTypes'
import { kSummarizerCreate, kSummarizerSummarize } from '#Shared/API/AISummarizer/AISummarizerIPCTypes'
import IPC from '../IPC'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'

class AISummarizer {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AISummarizerProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AISummarizerData, signal?: AbortSignal) {
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AISummarizerCloneOptions = {}): Promise<AISummarizer> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kSummarizerCreate, this.#props, { signal })) as AISummarizerData
    const session = new AISummarizer(data)
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

  get type () { return this.#props.type }

  get format () { return this.#props.format }

  get length () { return this.#props.length }

  /* **************************************************************************/
  // MARK: Summarizing
  /* **************************************************************************/

  summarize = async (input: string, options: AISummarizerSummarizeOptions = {}):Promise<string> => {
    return await readablePromptStreamToString(this.summarizeStreaming(input, options))
  }

  summarizeStreaming = (input: string, options: AISummarizerSummarizeOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPC.stream(
          kSummarizerSummarize,
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

export default AISummarizer
