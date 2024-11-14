import {
  AITranslatorData,
  AITranslatorProps,
  AITranslatorCloneOptions,
  AITranslatorTranslateOptions
} from '#Shared/API/AITranslator/AITranslatorTypes'
import { kTranslatorCreate, kTranslatorTranslate } from '#Shared/API/AITranslator/AITranslatorIPCTypes'
import IPC from '../IPC'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'

class AITranslator extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AITranslatorProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AITranslatorData, signal?: AbortSignal) {
    super(data.props)
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AITranslatorCloneOptions = {}): Promise<AITranslator> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kTranslatorCreate, this.#props, { signal })) as AITranslatorData
    const session = new AITranslator(data)
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
  // MARK: Summarizing
  /* **************************************************************************/

  translate = async (input: string, options: AITranslatorTranslateOptions = {}):Promise<string> => {
    return await readablePromptStreamToString(this.translateStreaming(input, options))
  }

  translateStreaming = (input: string, options: AITranslatorTranslateOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    return new ReadableStream({
      start: (controller) => {
        IPC.stream(
          kTranslatorTranslate,
          {
            sessionId: this.#sessionId,
            props: this.#props,
            input
          },
          (translation: string) => {
            controller.enqueue(translation)
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

export default AITranslator
