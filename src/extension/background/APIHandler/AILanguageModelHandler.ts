import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kLanguageModelGetCapabilities,
  kLanguageModelCreate,
  kLanguageModelDestroy,
  kLanguageModelCountTokens,
  kLanguageModelPrompt
} from '#Shared/API/AILanguageModel/AILanguageModelIPCTypes'
import {
  AILanguageModelData,
  AILanguageModelInitialPrompt,
  AILanguageModelPrompt,
  AILanguageModelPromptRole
} from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import PermissionProvider from '../PermissionProvider'
import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import { kModelPromptAborted, kModelPromptTypeNotSupported } from '#Shared/Errors'
import APIHelper from './APIHelper'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import AIPrompter from '../AI/AIPrompter'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { nanoid } from 'nanoid'
import { Template } from '@huggingface/jinja'
import { AICapabilityPromptType } from '#Shared/API/AI'

class AILanguageModelHandler {
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
      .addRequestHandler(kLanguageModelGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kLanguageModelCreate, this.#handleCreate)
      .addRequestHandler(kLanguageModelDestroy, this.#handleDestroy)
      .addRequestHandler(kLanguageModelPrompt, this.#handlePrompt)
      .addRequestHandler(kLanguageModelCountTokens, this.#handleCountTokens)
  }

  /* **************************************************************************/
  // MARK: Prompts
  /* **************************************************************************/

  /**
   * Builds the prompt from the users variables
   * @param manifest: the manifest object
   * @param systemPrompt: the system prompt
   * @param initialPrompts: the array of initial prompts
   * @param messages: the array of messages
   * @returns the prompt to pass to the LLM
   */
  async #buildPrompt (
    manifest: AIModelManifest,
    systemPrompt: string | undefined,
    initialPrompts: AILanguageModelInitialPrompt[],
    messages: AILanguageModelPrompt[]
  ) {
    if (!manifest.prompts[AICapabilityPromptType.LanguageModel]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const promptConfig = manifest.prompts[AICapabilityPromptType.LanguageModel]

    // Build the messages
    let tokenCount = systemPrompt
      ? await AIPrompter.countTokens(systemPrompt, manifest.tokens.method)
      : 0

    const history = [...initialPrompts, ...messages]
    const countedMessages=[]
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i]
      tokenCount += await AIPrompter.countTokens(message.content, manifest.tokens.method)
      if (tokenCount > manifest.tokens.max) {
        break
      }
      countedMessages.unshift(message)
    }
    const messagesWindow = [
      ...systemPrompt
        ? [{ content: systemPrompt, role: 'system' }, ...countedMessages]
        : countedMessages
    ]

    // Send to the template
    const template = new Template(promptConfig.template)
    const prompt = template.render({
      messages: messagesWindow,
      bos_token: promptConfig.bosToken,
      eos_token: promptConfig.eosToken
    })
    return prompt
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.LanguageModel)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.LanguageModel, async (
      manifest,
      payload,
      props
    ) => {
      const systemPrompt = payload.getString('systemPrompt')
      const initialPrompts = payload.getAILanguageModelInitialPrompts('initialPrompts')
      const tokensSoFar = await AIPrompter.countTokens(
        await this.#buildPrompt(manifest, systemPrompt, initialPrompts, []),
        manifest.tokens.method
      )

      return {
        sessionId: nanoid(),
        props: {
          ...props,
          systemPrompt,
          initialPrompts,
          grammar: payload.getAny('grammar'),
          maxTokens: manifest.tokens.max
        },
        state: {
          tokensSoFar,
          messages: []
        }
      } as AILanguageModelData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AIPrompter.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Token counting
  /* **************************************************************************/

  #handleCountTokens = async (channel: IPCInflightChannel) => {
    const modelId = await APIHelper.getModelId(channel.payload?.props?.model)
    const input = getNonEmptyString(channel.payload?.input)

    await PermissionProvider.ensureModelPermission(channel, modelId)

    const manifest = await AIModelFileSystem.readModelManifest(modelId)
    return await AIPrompter.countTokens(input, manifest.tokens.method)
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
    return await APIHelper.handleStandardPromptPreflight(channel, async (
      manifest,
      payload,
      options
    ) => {
      const systemPrompt = payload.getString('props.systemPrompt')
      const initialPrompts = payload.getAILanguageModelInitialPrompts('props.initialPrompts')
      const messages = payload.getAILanguageModelPrompts('messages')
      const prompt = await this.#buildPrompt(manifest, systemPrompt, initialPrompts, messages)
      const grammar = payload.getAny('props.grammar')
      if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

      const reply = (await AIPrompter.prompt(
        {
          ...options,
          prompt,
          grammar
        },
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )) as string

      return {
        tokensSoFar: await AIPrompter.countTokens(
          await this.#buildPrompt(
            manifest,
            systemPrompt,
            initialPrompts,
            [...messages, { role: AILanguageModelPromptRole.Assistant, content: reply }]
          ),
          manifest.tokens.method
        )
      }
    })
  }
}

export default AILanguageModelHandler
