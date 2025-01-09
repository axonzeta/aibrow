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
import { getNonEmptyString } from '#Shared/Typo/TypoParser'
import { kModelPromptAborted, kModelPromptTypeNotSupported } from '#Shared/Errors'
import APIHelper from './APIHelper'
import AILlmSession from '../AI/AILlmSession'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { nanoid } from 'nanoid'
import { Template } from '@huggingface/jinja'
import { AIModelPromptType, AIRootModelProps, AIModelType } from '#Shared/API/AI'

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
   * @param options: the prompt options
   * @param systemPrompt: the system prompt
   * @param initialPrompts: the array of initial prompts
   * @param messages: the array of messages
   * @returns the prompt to pass to the LLM
   */
  async #buildPrompt (
    manifest: AIModelManifest,
    props: AIRootModelProps,
    systemPrompt: string | undefined,
    initialPrompts: AILanguageModelInitialPrompt[],
    messages: AILanguageModelPrompt[]
  ) {
    if (!manifest.prompts[AIModelPromptType.LanguageModel]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const promptConfig = manifest.prompts[AIModelPromptType.LanguageModel]

    let droppedMessages = 0
    while (true) {
      const allMessages = [...initialPrompts, ...messages]
      if (droppedMessages >= allMessages.length && droppedMessages > 0) {
        throw new Error('Failed to build prompt. Context window overflow.')
      }
      const history = [
        ...systemPrompt
          ? [{ content: systemPrompt, role: 'system' }]
          : [],
        ...allMessages.slice(droppedMessages)
      ]
      const template = new Template(promptConfig.template)
      const prompt = template.render({
        messages: history,
        bos_token: manifest.tokens.bosToken,
        eos_token: manifest.tokens.eosToken,
        add_generation_prompt: true
      })

      const tokenCount = await AILlmSession.countTokens(prompt, props, {})
      if (tokenCount <= props.contextSize) {
        return prompt
      }

      droppedMessages++
    }
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AIModelPromptType.LanguageModel)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.LanguageModel, async (
      manifest,
      payload,
      props
    ) => {
      const systemPrompt = payload.getString('systemPrompt')
      const initialPrompts = payload.getAILanguageModelInitialPrompts('initialPrompts')
      const tokensSoFar = await AILlmSession.countTokens(
        await this.#buildPrompt(manifest, props, systemPrompt, initialPrompts, []),
        props,
        {}
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
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Token counting
  /* **************************************************************************/

  #handleCountTokens = async (channel: IPCInflightChannel) => {
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
  }
}

export default AILanguageModelHandler
