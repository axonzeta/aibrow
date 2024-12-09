import {
  AICoreModelPromptOptions,
  AICoreModelData,
  AICoreModelProps,
  AICoreModelCloneOptions
} from './AICoreModelTypes'
import { kCoreModelCreate, kCoreModelPrompt, kCoreModelCountTokens } from './AICoreModelIPCTypes'
import { kSessionDestroyed } from '../../Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'
import IPCClient from '../../IPC/IPCClient'

class AICoreModel extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient
  #sessionId: string
  #props: AICoreModelProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient, data: AICoreModelData, signal?: AbortSignal) {
    super(data.props)
    this.#ipc = ipc
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AICoreModelCloneOptions = {}): Promise<AICoreModel> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await this.#ipc.request(kCoreModelCreate, this.#props, { signal })) as AICoreModelData
    const session = new AICoreModel(this.#ipc, data)
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

  get grammar () { return this.#props.grammar }

  /* **************************************************************************/
  // MARK: Prompting
  /* **************************************************************************/

  prompt = async (prompt: string, options: AICoreModelPromptOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.promptStreaming(prompt, options))
  }

  promptStreaming = (prompt: string, options: AICoreModelPromptOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        this.#ipc.stream(
          kCoreModelPrompt,
          {
            sessionId: this.#sessionId,
            props: this.#props,
            prompt
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

  /* **************************************************************************/
  // MARK: Tokens
  /* **************************************************************************/

  countPromptTokens = async (prompt: string, options: AICoreModelPromptOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const count = (await this.#ipc.request(kCoreModelCountTokens, { props: this.#props, input: prompt }, { signal })) as number
    return count
  }
}

export default AICoreModel
