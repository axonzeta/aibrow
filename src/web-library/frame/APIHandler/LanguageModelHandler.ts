import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kLanguageModelCompatibility,
  kLanguageModelAvailability,
  kLanguageModelParams,
  kLanguageModelCreate,
  kLanguageModelDestroy,
  kLanguageModelPrompt,
  kLanguageModelMeasureInput
} from '#Shared/API/LanguageModel/LanguageModelIPCTypes'
import {
  LanguageModelParams,
  LanguageModelState,
  LanguageModelMessage,
  LanguageModelMessageContent,
  LanguageModelMessageType,
  LanguageModelMessageRole
} from '#Shared/API/LanguageModel/LanguageModelTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType,
  AIModelPromptProps
} from '#Shared/API/AICoreTypes'
import { AIModelManifest } from '#Shared/AIModelManifest'
import {
  getEnum,
  getNonEmptyString
} from '#Shared/Typo/TypoParser'
import {
  kModelPromptTypeNotSupported,
  kModelInputTypeNotSupported,
  kModelInputTooLong
} from '#Shared/Errors'
import { Template } from '@huggingface/jinja'
import AILlmSession from '../AI/AILlmSession'
import AIModelManager from '../AI/AIModelManager'
import TypoObject from '#Shared/Typo/TypoObject'

class LanguageModelHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #server: IPCServer

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (server: IPCServer) {
    this.#server = server

    this.#server
      .addRequestHandler(kLanguageModelAvailability, this.#handleGetAvailability)
      .addRequestHandler(kLanguageModelCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kLanguageModelParams, this.#handleGetParams)
      .addRequestHandler(kLanguageModelCreate, this.#handleCreate)
      .addRequestHandler(kLanguageModelDestroy, this.#handleDestroy)
      .addRequestHandler(kLanguageModelPrompt, this.#handlePrompt)
      .addRequestHandler(kLanguageModelMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * Parses untrusted messages
   * @param messages: the messages to parse
   * @returns LanguageModelMessage array
   */
  #parseTypoMessages (messages: any): LanguageModelMessage[] {
    return Array.isArray(messages)
      ? messages.reduce((acc: LanguageModelMessage[], item: any) => {
        if (typeof (item) === 'object' && item !== null) {
          const role: LanguageModelMessageRole = getEnum(item.role, LanguageModelMessageRole, LanguageModelMessageRole.User)
          const content: LanguageModelMessageContent[] = []
          if (typeof (item.content) === 'string') {
            content.push({ type: LanguageModelMessageType.Text, content: item.content })
          } else if (Array.isArray(item.content)) {
            for (const contentItem of item.content) {
              if (typeof (contentItem) === 'object') {
                const type: LanguageModelMessageType = getEnum(contentItem.type, LanguageModelMessageType, LanguageModelMessageType.Text)
                const contentValue = contentItem.content
                content.push({ type, content: contentValue })
              }
            }
          }

          if (content.length) {
            acc.push({ role, content })
          }
        }
        return acc
      }, [])
      : []
  }

  /**
   * Builds the prompt from the users variables
   * @param manifest: the manifest object
   * @package sessionId: the id of the session
   * @param messages: the array of messages
   * @param contextSize: the context size
   * @returns the prompt and the token usage
   */
  async #buildPrompt (
    manifest: AIModelManifest,
    sessionId: string,
    promptProps: Partial<AIModelPromptProps>,
    messages: LanguageModelMessage[]
  ) {
    if (!manifest.prompts[AIModelPromptType.LanguageModel]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const promptConfig = manifest.prompts[AIModelPromptType.LanguageModel]

    // Split the messages into system and non system
    const { systemMessages, chatMessages } = messages.reduce((acc, msg) => {
      if (msg.role === LanguageModelMessageRole.System) {
        acc.systemMessages.push(msg)
      } else {
        acc.chatMessages.push(msg)
      }
      return acc
    }, { systemMessages: [], chatMessages: [] } as { systemMessages: LanguageModelMessage[], chatMessages: LanguageModelMessage[] })

    // Work out the maximum number of messages we can fit in the context window
    let droppedMessages = 0
    while (true) {
      if (droppedMessages >= chatMessages.length && droppedMessages > 0) {
        throw new Error(kModelInputTooLong)
      }

      const template = new Template(promptConfig.template)
      const prompt = template.render({
        messages: [
          ...systemMessages,
          ...chatMessages.slice(droppedMessages)
        ].flatMap((item) => {
          return item.content.map((contentItem) => {
            if (contentItem.type === LanguageModelMessageType.Text) {
              return { role: item.role, content: contentItem.content }
            } else {
              throw new Error(kModelInputTypeNotSupported)
            }
          })
        }),
        bos_token: manifest.tokens.bosToken,
        eos_token: manifest.tokens.eosToken,
        add_generation_prompt: true
      })

      const tokenCount = await AILlmSession.countTokens(sessionId, prompt, promptProps, {})
      const contextSize = promptProps.contextSize ?? manifest.tokens.max
      if (tokenCount <= contextSize) {
        return { prompt, usage: tokenCount }
      }

      droppedMessages++
    }
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #buildStateFromPayload = async (manifest: AIModelManifest, payload: TypoObject, messages: LanguageModelMessage[]) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
      topK: payload.getNumber('topK', manifest.config.topK?.[1] ?? 0),
      topP: payload.getNumber('topP', manifest.config.topP?.[1] ?? 0),
      repeatPenalty: payload.getNumber('repeatPenalty', manifest.config.repeatPenalty?.[1] ?? 0),
      temperature: payload.getNumber('temperature', manifest.config.temperature?.[1] ?? 0),
      messages,
      inputUsage: -1, // Optionally filled later
      inputQuota: manifest.tokens.max
    } as LanguageModelState
  }

  #buildPromptPropsFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    const state = payload.getTypo('state')
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, state),
      topK: state.getNumber('topK', manifest.config.topK?.[1] ?? 0),
      topP: state.getNumber('topP', manifest.config.topP?.[1] ?? 0),
      repeatPenalty: state.getNumber('repeatPenalty', manifest.config.repeatPenalty?.[1] ?? 0),
      temperature: state.getNumber('temperature', manifest.config.temperature?.[1] ?? 0)
    } as Partial<AIModelPromptProps>
  }

  /* **************************************************************************/
  // MARK: Handlers: Availability & compatibility
  /* **************************************************************************/

  #handleGetAvailability = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.LanguageModel)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.LanguageModel)
  }

  #handleGetParams = async (channel: IPCInflightChannel) => {
    return await APIHelper.captureCommonErrorsForResponse(async () => {
      const modelId = await APIHelper.getModelId(channel.payload?.model, AIModelType.Text)

      const manifest = await AIModelManager.fetchModelManifest(modelId)
      return <LanguageModelParams> {
        defaultTopK: manifest.config.topK?.[1] ?? null,
        maxTopK: manifest.config.topK?.[2] ?? null,
        defaultTopP: manifest.config.topP?.[1] ?? null,
        maxTopP: manifest.config.topP?.[2] ?? null,
        defaultRepeatPenalty: manifest.config.repeatPenalty?.[1] ?? null,
        maxRepeatPenalty: manifest.config.repeatPenalty?.[2] ?? null,
        defaultTemperature: manifest.config.temperature?.[1] ?? null,
        maxTemperature: manifest.config.temperature?.[2] ?? null
      }
    })
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.LanguageModel, async (
      manifest,
      sessionId,
      payload
    ): Promise<{ sessionId: string, state: LanguageModelState }> => {
      const messages = this.#parseTypoMessages(payload.getAny('initialPrompts', undefined))
      const state = await this.#buildStateFromPayload(manifest, payload, messages)
      state.inputUsage = (await this.#buildPrompt(manifest, sessionId, state, messages)).usage

      return { sessionId, state }
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Token counting
  /* **************************************************************************/

  #handleMeasureInput = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const messages = this.#parseTypoMessages(payload.getAny('state.messages', undefined))
      const input = payload.getNonEmptyString('input')
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      const { usage } = await this.#buildPrompt(manifest, sessionId, promptProps, [
        ...messages,
        { role: LanguageModelMessageRole.User, content: [{ type: LanguageModelMessageType.Text, content: input }] }
      ])
      return usage
    })
  }

  /* **************************************************************************/
  // MARK: Handlers: Prompts
  /* **************************************************************************/

  /**
   * Sends the session prompt to the native binary with the updated payload
   * @param channel: the IPC channel that is being processed
   * @returns the stream response
   */
  #handlePrompt = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const messages = this.#parseTypoMessages(payload.getAny('state.messages', undefined))
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      const { prompt } = await this.#buildPrompt(manifest, sessionId, promptProps, messages)
      const responseConstraint = payload.getAny('options.responseConstraint', undefined)
      if (responseConstraint) {
        throw new Error('Response constraint is not supported using WebAI.')
      }

      const reply = (await AILlmSession.prompt(
        sessionId,
        prompt,
        promptProps,
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )) as string

      const nextMessages = [
        ...messages,
        { role: LanguageModelMessageRole.Assistant, content: [{ type: LanguageModelMessageType.Text, content: reply }] }
      ]
      return {
        messages: nextMessages,
        usage: (await this.#buildPrompt(manifest, sessionId, promptProps, nextMessages)).usage
      }
    })
  }
}

export default LanguageModelHandler
