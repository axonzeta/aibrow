import {
  AICoreModelPromptOptions,
  AICoreModelData,
  AICoreModelProps,
  AICoreModelCloneOptions
} from '#Shared/API/AICoreModel/AICoreModelTypes'
import IPC from '../IPC'
import { kCoreModelCreate, kCoreModelPrompt } from '#Shared/API/AICoreModel/AICoreModelIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'

class AICoreModel extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AICoreModelProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AICoreModelData, signal?: AbortSignal) {
    super(data.props)
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
    const data = (await IPC.request(kCoreModelCreate, this.#props, { signal })) as AICoreModelData
    const session = new AICoreModel(data)
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
  // MARK: Summarizing
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
        IPC.stream(
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
}

export default AICoreModel
