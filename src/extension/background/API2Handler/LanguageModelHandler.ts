import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kLanguageModelCompatibility,
  kLanguageModelAvailability,
  kLanguageModelParams,
  kLanguageModelCreate,
  kLanguageModelDestroy
} from '#Shared/API2/LanguageModel/LanguageModelIPCTypes'
import {
  LanguageModelParams,
  LanguageModelState,
  LanguageModelMessage,
  LanguageModelMessageContent,
  LanguageModelMessageType,
  LanguageModelMessageRole
} from '#Shared/API2/LanguageModel/LanguageModelTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType,
  AIModelCoreState
} from '#Shared/API2/AICoreTypes'
import PermissionProvider from '../PermissionProvider'
import { AIModelManifest } from '#Shared/AIModelManifest'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import AIModelDownload from '../AI/AIModelDownload'
import { nanoid } from 'nanoid'
import {
  getEnum,
  getNonEmptyString
} from '#Shared/Typo/TypoParser'
import {
  kModelPromptTypeNotSupported
} from '#Shared/Errors'
import { Template } from '@huggingface/jinja'
import AILlmSession from '../AI/AILlmSession'
import {
  TRANS_AIModelCoreState_To_AIRootModelProps
} from '#Shared/API2/Transition'

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
      /*.addRequestHandler(kLanguageModelGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kLanguageModelCreate, this.#handleCreate)
      .addRequestHandler(kLanguageModelDestroy, this.#handleDestroy)
      .addRequestHandler(kLanguageModelPrompt, this.#handlePrompt)
      .addRequestHandler(kLanguageModelCountTokens, this.#handleCountTokens)*/
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
   * @param messages: the array of messages
   * @param contextSize: the context size
   * @returns the prompt to pass to the LLM
   */
  async #buildPrompt (
    manifest: AIModelManifest,
    state: AIModelCoreState,
    messages: LanguageModelMessage[]
  ) {
    if (!manifest.prompts[AIModelPromptType.LanguageModel]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const promptConfig = manifest.prompts[AIModelPromptType.LanguageModel]

    let droppedMessages = 0
    while (true) {
      if (droppedMessages >= messages.length && droppedMessages > 0) {
        throw new Error('Failed to build prompt. Context window overflow.')
      }

      if (droppedMessages) {
        //TODO: this should always keep the system prompts
        messages.slice(droppedMessages)
      }

      const template = new Template(promptConfig.template)
      const prompt = template.render({
        messages,
        bos_token: manifest.tokens.bosToken,
        eos_token: manifest.tokens.eosToken,
        add_generation_prompt: true
      })

      const tokenCount = await AILlmSession.countTokens(prompt, TRANS_AIModelCoreState_To_AIRootModelProps(state), {})
      if (tokenCount <= state.contextSize) {
        return prompt
      }

      droppedMessages++
    }
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

      // Permission checks & requests
      await PermissionProvider.requestModelPermission(channel, modelId)
      await PermissionProvider.ensureModelPermission(channel, modelId)

      let manifest: AIModelManifest
      try {
        manifest = await AIModelFileSystem.readModelManifest(modelId)
      } catch (ex) {
        try {
          manifest = await AIModelDownload.fetchModelManifest(modelId)
        } catch (ex) {
          return null
        }
      }

      return <LanguageModelParams> {
        defaultTopK: manifest.config.topK?.[1] ?? null,
        maxTopK: manifest.config.topK?.[2] ?? null,
        defaultTemperature: manifest.config.temperature?.[1] ?? null,
        maxTemperature: manifest.config.temperature?.[2] ?? null
      }
    })
  }

  /*#handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AIModelPromptType.LanguageModel)
  }*/

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.LanguageModel, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: LanguageModelState }> => {
      const messages = this.#parseTypoMessages(payload.getAny('initialPrompts', undefined))
      const state: LanguageModelState = {
        ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
        topK: payload.getNumber('topK', manifest.config.topK?.[1] ?? 0),
        temperature: payload.getNumber('temperature', manifest.config.temperature?.[1] ?? 0),
        messages,
        inputUsage: 0, // Filled later
        inputQuota: manifest.tokens.max
      }

      state.inputUsage = await AILlmSession.countTokens(
        await this.#buildPrompt(manifest, state, messages),
        TRANS_AIModelCoreState_To_AIRootModelProps(state),
        {}
      )

      return { sessionId: nanoid(), state }
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Token counting
  /* **************************************************************************/

  /*#handleCountTokens = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const input = payload.getString('input')
      const prompt = await this.#buildPrompt(
        manifest,
        props,
        undefined,
        [],
        [{ role: AILanguageModelPromptRole.User, content: input }]
      )
      if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

      const count = (await AILlmSession.countTokens(
        prompt,
        props,
        { signal: channel.abortSignal }
      )) as number

      return count
    })
  }*/

  /* **************************************************************************/
  // MARK: Handlers: Prompts
  /* **************************************************************************/

  /**
   * Sends the session prompt to the native binary with the updated payload
   * @param channel: the IPC channel that is being processed
   * @returns the stream response
   */
  /*#handlePrompt = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const systemPrompt = payload.getString('props.systemPrompt')
      const initialPrompts = payload.getAILanguageModelInitialPrompts('props.initialPrompts')
      const messages = payload.getAILanguageModelPrompts('messages')
      const prompt = await this.#buildPrompt(manifest, props, systemPrompt, initialPrompts, messages)
      const sessionId = payload.getNonEmptyString('sessionId')
      if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

      const reply = (await AILlmSession.prompt(
        sessionId,
        prompt,
        props,
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )) as string

      return {
        tokensSoFar: await AILlmSession.countTokens(
          await this.#buildPrompt(
            manifest,
            props,
            systemPrompt,
            initialPrompts,
            [...messages, { role: AILanguageModelPromptRole.Assistant, content: reply }]
          ),
          props,
          {}
        )
      }
    })
  }*/
}

export default LanguageModelHandler
