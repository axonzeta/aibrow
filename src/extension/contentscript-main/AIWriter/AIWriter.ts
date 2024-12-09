import {
  AIWriterWriteOptions,
  AIWriterData,
  AIWriterProps,
  AIWriterCloneOptions
} from '#Shared/API/AIWriter/AIWriterTypes'
import { kWriterCreate, kWriterWrite } from '#Shared/API/AIWriter/AIWriterIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'
import IPCClient from '#Shared/IPC/IPCClient'

class AIWriter extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient
  #sessionId: string
  #props: AIWriterProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient, data: AIWriterData, signal?: AbortSignal) {
    super(data.props)
    this.#ipc = ipc
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
    const data = (await this.#ipc.request(kWriterCreate, this.#props, { signal })) as AIWriterData
    const session = new AIWriter(this.#ipc, data)
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
        this.#ipc.stream(
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
