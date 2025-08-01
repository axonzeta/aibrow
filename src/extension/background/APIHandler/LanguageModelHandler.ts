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
  kLanguageModelChat,
  kLanguageModelMeasureInput,
  kLanguageModelToolResult,
  LanguageModelStreamChunkType
} from '#Shared/API/LanguageModel/LanguageModelIPCTypes'
import {
  LanguageModelParams,
  LanguageModelState,
  LanguageModelMessage,
  LanguageModelMessageContent,
  LanguageModelMessageType,
  LanguageModelMessageRole,
  LanguageModelTool
} from '#Shared/API/LanguageModel/LanguageModelTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType,
  AIModelPromptProps
} from '#Shared/API/AICoreTypes'
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
  kModelPromptTypeNotSupported,
  kModelInputTypeNotSupported,
  kModelInputTooLong
} from '#Shared/Errors'
import { Template } from '@huggingface/jinja'
import AILlmSession from '../AI/AILlmSession'
import TypoObject from '#Shared/Typo/TypoObject'

class LanguageModelHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #server: IPCServer
  #toolCallResolvers = new Map<string, (result: any) => void>()

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
      .addRequestHandler(kLanguageModelChat, this.#handleChat)
      .addRequestHandler(kLanguageModelMeasureInput, this.#handleMeasureInput)
      .addRequestHandler(kLanguageModelToolResult, this.#handleToolResult)
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
            content.push({ type: LanguageModelMessageType.Text, value: item.content })
          } else if (Array.isArray(item.content)) {
            for (const contentItem of item.content) {
              if (typeof (contentItem) === 'object') {
                const type: LanguageModelMessageType = getEnum(contentItem.type, LanguageModelMessageType, LanguageModelMessageType.Text)
                content.push({ type, value: contentItem.value })
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
   * @returns the prompt and the token usage
   */
  async #buildPrompt (
    manifest: AIModelManifest,
    promptProps: Partial<AIModelPromptProps>,
    messages: LanguageModelMessage[],
    prefix: string | undefined
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
              return { role: item.role, content: contentItem.value }
            } else {
              throw new Error(kModelInputTypeNotSupported)
            }
          })
        }),
        bos_token: manifest.tokens.bosToken,
        eos_token: manifest.tokens.eosToken,
        add_generation_prompt: true
      }) + (prefix ? prefix.trim() : '')

      const tokenCount = await AILlmSession.countTokens(prompt, promptProps, {})
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
    // Extract tools but strip execute functions for security
    const tools = payload.getAny('tools', []) as LanguageModelTool[]
    const toolDescriptors = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))

    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
      topK: payload.getNumber('topK', manifest.config.topK?.[1] ?? 0),
      topP: payload.getNumber('topP', manifest.config.topP?.[1] ?? 0),
      repeatPenalty: payload.getNumber('repeatPenalty', manifest.config.repeatPenalty?.[1] ?? 0),
      temperature: payload.getNumber('temperature', manifest.config.temperature?.[1] ?? 0),
      messages,
      tools: toolDescriptors,
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

      return {
        defaultTopK: manifest.config.topK?.[1] ?? null,
        maxTopK: manifest.config.topK?.[2] ?? null,
        defaultTopP: manifest.config.topP?.[1] ?? null,
        maxTopP: manifest.config.topP?.[2] ?? null,
        defaultRepeatPenalty: manifest.config.repeatPenalty?.[1] ?? null,
        maxRepeatPenalty: manifest.config.repeatPenalty?.[2] ?? null,
        defaultTemperature: manifest.config.temperature?.[1] ?? null,
        maxTemperature: manifest.config.temperature?.[2] ?? null
      } as LanguageModelParams
    })
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.LanguageModel, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: LanguageModelState }> => {
      const messages = this.#parseTypoMessages(payload.getAny('initialPrompts', undefined))
      const state = await this.#buildStateFromPayload(manifest, payload, messages)
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      state.inputUsage = (await this.#buildPrompt(manifest, promptProps, messages, undefined)).usage

      return { sessionId: nanoid(), state }
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
      const messages = this.#parseTypoMessages(payload.getAny('state.messages', undefined))
      const input = payload.getNonEmptyString('input')
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      const { usage } = await this.#buildPrompt(manifest, promptProps, [
        ...messages,
        {
          role: LanguageModelMessageRole.User,
          content: [{ type: LanguageModelMessageType.Text, value: input }]
        }
      ], undefined)
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
      // Check if tools are present and throw error since prompt() doesn't support tools
      const tools = payload.getAny('state.tools', [])
      if (tools && tools.length > 0) {
        throw new Error('Tool calling is not supported with the prompt() method. Use chat() instead.')
      }

      const sessionId = payload.getNonEmptyString('sessionId')
      const messages = this.#parseTypoMessages(payload.getAny('state.messages', undefined))
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      const responseConstraint = payload.getAny('options.responseConstraint', undefined)
      const prefix = payload.getNonEmptyTrimString('options.prefix', '')
      const { prompt } = await this.#buildPrompt(manifest, promptProps, messages, prefix)

      let grammar: any
      if (responseConstraint) {
        grammar = responseConstraint
      }

      let pendingPrefixEmit = !!prefix
      const reply = (await AILlmSession.prompt(
        sessionId,
        prompt,
        grammar ? { ...promptProps, grammar } : promptProps,
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => {
            if (pendingPrefixEmit) {
              pendingPrefixEmit = false
              channel.emit(prefix)
            }
            channel.emit(chunk)
          }
        }
      )) as string

      const nextMessages = [
        ...messages,
        {
          role: LanguageModelMessageRole.Assistant,
          content: [{
            type: LanguageModelMessageType.Text,
            value: prefix + reply
          }]
        }
      ]
      return {
        messages: nextMessages,
        usage: (await this.#buildPrompt(manifest, promptProps, nextMessages, undefined)).usage
      }
    })
  }

  #handleChat = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const promptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      const responseConstraint = payload.getAny('options.responseConstraint', undefined)
      const prefix = payload.getNonEmptyTrimString('options.prefix', undefined)
      const history = payload.has('state.history')
        ? this.#parseTypoMessages(payload.getAny('state.history', []))
        : undefined
      const historyHash = payload.getString('state.historyHash', undefined)
      const prompt = payload.has('options.prompt')
        ? this.#parseTypoMessages([payload.getAny('options.prompt')])[0]
        : undefined

      // Extract tools for passing to native backend
      const tools = payload.getAny('state.tools', [])

      const reply = await AILlmSession.chat(
        sessionId,
        prompt,
        historyHash,
        history,
        {
          ...promptProps,
          prefix,
          grammar: responseConstraint,
          tools
        },
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => { channel.emit({ type: LanguageModelStreamChunkType.Reply, data: chunk }) },
          onToolCall: tools && tools.length > 0 ? async (toolCall: any) => {
            // Create a unique ID for this tool call
            const toolCallId = nanoid()

            // Emit tool call event to content script
            channel.emit({ type: LanguageModelStreamChunkType.ToolCall, toolCallId, toolCall })

            // Wait for the tool result
            return new Promise((resolve) => {
              this.#toolCallResolvers.set(toolCallId, resolve)
            })
          } : undefined
        }
      )

      return reply
    })
  }

  #handleToolResult = async (channel: IPCInflightChannel) => {
    const payload = new TypoObject(channel.payload)
    const toolCallId = payload.getNonEmptyString('toolCallId')
    const result = payload.getAny('result')

    const resolver = this.#toolCallResolvers.get(toolCallId)
    if (resolver) {
      this.#toolCallResolvers.delete(toolCallId)
      resolver(result)
      return { success: true }
    } else {
      throw new Error(`No pending tool call found with ID: ${toolCallId}`)
    }
  }
}

export default LanguageModelHandler
