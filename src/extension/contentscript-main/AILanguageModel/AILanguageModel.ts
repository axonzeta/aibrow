import {
  AILanguageModelProps,
  AILanguageModelState,
  AILanguageModelData,
  AILanguageModelCloneOptions,
  AILanguageModelPromptOptions,
  AILanguageModelPromptRole,
  AILanguageModelPromptInput
} from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import {
  kLanguageModelCreate,
  kLanguageModelDestroy,
  kLanguageModelCountTokens,
  kLanguageModelPrompt
} from '#Shared/API/AILanguageModel/AILanguageModelIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import { readablePromptStreamToString } from '../AIHelpers'
import AIRootModel from '../AIRootModel'
import IPCClient from '#Shared/IPC/IPCClient'

export class AILanguageModel extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient
  #sessionId: string
  #props: AILanguageModelProps
  #state: AILanguageModelState
  #signal: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient, data: AILanguageModelData, signal?: AbortSignal) {
    super(data.props)
    this.#ipc = ipc
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#state = data.state
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AILanguageModelCloneOptions = {}): Promise<AILanguageModel> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await this.#ipc.request(kLanguageModelCreate, this.#props, { signal })) as AILanguageModelData
    const session = new AILanguageModel(this.#ipc, data)
    return session
  }

  destroy = () => {
    this.#destroyed = true
    this.#ipc.request(kLanguageModelDestroy, { sessionId: this.#sessionId })
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

  get maxTokens () { return this.#props.maxTokens }

  get tokensSoFar () { return this.#state.tokensSoFar }

  get tokensLeft () { return this.maxTokens - this.tokensSoFar }

  /* **************************************************************************/
  // MARK: Prompts
  /* **************************************************************************/

  prompt = async (input: AILanguageModelPromptInput, options: AILanguageModelPromptOptions = {}): Promise<string> => {
    return await readablePromptStreamToString(this.promptStreaming(input, options))
  }

  promptStreaming = (input: AILanguageModelPromptInput, options: AILanguageModelPromptOptions = {}): ReadableStream => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    if (typeof input === 'string') {
      this.#state.messages.push({ content: input, role: AILanguageModelPromptRole.User })
    } else if (Array.isArray(input)) {
      const promptMessages = []
      for (const item of input) {
        if (typeof (item.content) !== 'string' || Object.values(AILanguageModelPromptRole).includes(item.role) === false) {
          throw new Error('Malformed input')
        }
        promptMessages.push({ content: item.content, role: item.role })
      }
      this.#state.messages.push(...promptMessages)
    } else if (typeof (input) === 'object') {
      if (typeof (input.content) !== 'string' || Object.values(AILanguageModelPromptRole).includes(input.role) === false) {
        throw new Error('Malformed input')
      }
      this.#state.messages.push({ content: input.content, role: input.role })
    }

    return new ReadableStream({
      start: (controller) => {
        let buffer = ''
        this.#ipc.stream(
          kLanguageModelPrompt,
          {
            sessionId: this.#sessionId,
            props: this.#props,
            messages: this.#state.messages
          },
          (chunk: string) => {
            buffer += chunk
            controller.enqueue(buffer)
          },
          { signal }
        ).then(
          ({ tokensSoFar }: any) => {
            this.#state.tokensSoFar = tokensSoFar
            this.#state.messages.push({ content: buffer, role: AILanguageModelPromptRole.Assistant })
            controller.close()
          },
          (ex: Error) => {
            controller.error(ex)
          }
        )
      }
    })
  }

  /* **************************************************************************/
  // MARK: Tokens
  /* **************************************************************************/

  countPromptTokens = async (input: AILanguageModelPromptInput, options: AILanguageModelPromptOptions = {}): Promise<number> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const count = (await this.#ipc.request(kLanguageModelCountTokens, { props: this.#props, input }, { signal })) as number
    return count
  }
}

export default AILanguageModel
