import {
  AIWriterWriteOptions,
  AIWriterData,
  AIWriterProps,
  AIWriterCloneOptions
} from '#Shared/API/AIWriter/AIWriterTypes'
import IPC from '../IPC'
import { kWriterCreate, kWriterWrite } from '#Shared/API/AIWriter/AIWriterIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'

class AIWriter {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AIWriterProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIWriterData, signal?: AbortSignal) {
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AIWriterCloneOptions = {}): Promise<AIWriter> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kWriterCreate, this.#props, { signal })) as AIWriterData
    const session = new AIWriter(data)
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

  write = async (input: string, options: AIWriterWriteOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.writeStreaming(input, options))
  }

  writeStreaming = (input: string, options: AIWriterWriteOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        IPC.stream(
          kWriterWrite,
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

export default AIWriter
