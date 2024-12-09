import {
  AISummarizerData,
  AISummarizerProps,
  AISummarizerCloneOptions,
  AISummarizerSummarizeOptions
} from './AISummarizerTypes'
import { kSummarizerCreate, kSummarizerSummarize } from './AISummarizerIPCTypes'
import { kSessionDestroyed } from '../../Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'
import IPCClient from '../../IPC/IPCClient'

class AISummarizer extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient
  #sessionId: string
  #props: AISummarizerProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient, data: AISummarizerData, signal?: AbortSignal) {
    super(data.props)
    this.#ipc = ipc
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
    const data = (await this.#ipc.request(kSummarizerCreate, this.#props, { signal })) as AISummarizerData
    const session = new AISummarizer(this.#ipc, data)
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
        this.#ipc.stream(
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
