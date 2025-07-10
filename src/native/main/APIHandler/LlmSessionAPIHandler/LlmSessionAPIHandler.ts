import BrowserIPC from '../../BrowserIPC'
import {
  kLlmSessionGetSupportedGpuEngines,
  kLlmSessionGetModelScore,
  kLlmSessionExecPromptSession,
  kLlmSessionExecChatSession,
  kLlmSessionGetEmbeddingVectors,
  kLlmSessionCountPromptTokens,
  kLlmSessionDisposeSession,
  kLlmSessionToolResult
} from '#Shared/NativeAPI/LlmSessionIPC'
import { AIModelGpuEngine, AIModelPromptProps, AIModelType } from '#Shared/API/AICoreTypes'
import { importLlama } from '#R/Llama'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import Logger from '#R/Logger'
import config from '#Shared/Config'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import { kModelPromptAborted } from '#Shared/Errors'
import TypoParser from '#Shared/Typo/TypoObject'
import { clamp } from '#Shared/Typo/TypoParser'
import { AIModelManifest, AIModelFormat } from '#Shared/AIModelManifest'
import AsyncQueue from '#Shared/AsyncQueue'
import AIModelId from '#Shared/AIModelId'
import LlmSession from './LlmSession'
import type {
  ChatHistoryItem,
  ChatSystemMessage,
  ChatUserMessage,
  ChatModelResponse,
  LLamaChatPromptOptions
} from '@aibrow/node-llama-cpp'
import {
  LanguageModelMessage,
  LanguageModelMessageRole
} from '#Shared/API/LanguageModel/LanguageModelTypes'

class LlmSessionAPIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #activeSession: LlmSession
  #requestQueue: AsyncQueue
  #toolCallResolvers: Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }>

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#activeSession = new LlmSession()
    this.#requestQueue = new AsyncQueue()
    this.#toolCallResolvers = new Map()

    BrowserIPC
      .addRequestHandler(kLlmSessionGetSupportedGpuEngines, this.#handleGetSupportedGpuEngines)
      .addRequestHandler(kLlmSessionGetModelScore, this.#handleGetModelScore)
      .addRequestHandler(kLlmSessionExecPromptSession, this.#handleExecPromptSession)
      .addRequestHandler(kLlmSessionExecChatSession, this.#handleExecChatSession)
      .addRequestHandler(kLlmSessionGetEmbeddingVectors, this.#handleGetEmbeddingVectors)
      .addRequestHandler(kLlmSessionCountPromptTokens, this.#handleExecCountPromptTokens)
      .addRequestHandler(kLlmSessionDisposeSession, this.#handleDisposeSession)
      .addRequestHandler(kLlmSessionToolResult, this.#handleToolResult)
  }

  /* **************************************************************************/
  // MARK: Platform support
  /* **************************************************************************/

  #handleGetSupportedGpuEngines = async () => {
    const possibleEngines: Exclude<AIModelGpuEngine, AIModelGpuEngine.Wasm | AIModelGpuEngine.WebGpu>[] = [
      AIModelGpuEngine.Cuda,
      AIModelGpuEngine.Vulkan,
      AIModelGpuEngine.Cpu,
      AIModelGpuEngine.Metal
    ]

    const { getLlamaGpuTypes, getLlama, LlamaLogLevel } = await importLlama()
    const llamaSupportedGpuTypes = await getLlamaGpuTypes('supported')

    const supportedEngines: AIModelGpuEngine[] = await Promise.all(possibleEngines
      .filter((engine) => llamaSupportedGpuTypes.includes(engine === AIModelGpuEngine.Cpu ? false : engine))
      .map(async (engine) => {
        try {
          await getLlama({
            gpu: engine === AIModelGpuEngine.Cpu ? false : engine,
            build: 'never',
            logLevel: LlamaLogLevel.disabled,
            dryRun: true
          })
          return engine
        } catch (err) {
          return undefined
        }
      })
      .filter(Boolean)
    )

    return supportedEngines
  }

  #handleGetModelScore = async (channel: IPCInflightChannel) => {
    const props = new TypoParser(channel.payload)
    const gpuEngine = props.getEnum('gpuEngine', AIModelGpuEngine, undefined)
    const flashAttention = props.getBool('flashAttention', false)
    const contextSize = props.getNumber('contextSize', 2048)
    const modelId = props.getNonEmptyString('modelId')
    const modelUrl = props.getNonEmptyString('modelUrl')

    const { readGgufFileInfo, GgufInsights } = await importLlama()
    const llama = await this.#activeSession.getLlama(gpuEngine)

    const ggufFileInfo = await readGgufFileInfo(
      modelId
        ? await (async () => {
          const manifest = await AIModelFileSystem.readModelManifest(new AIModelId(modelId))
          if (!manifest.formats[AIModelFormat.GGUF]) {
            throw new Error('Model does not support GGUF format')
          }
          return AIModelFileSystem.getAssetPath(manifest.formats[AIModelFormat.GGUF].model)
        })()
        : modelUrl,
      { fetchHeaders: undefined }
    )

    const ggufInsights = await GgufInsights.from(ggufFileInfo, llama)
    const res = await ggufInsights.configurationResolver.resolveAndScoreConfig({
      flashAttention,
      targetContextSize: contextSize,
      targetGpuLayers: undefined,
      embeddingContext: false
    })

    return res.totalScore
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * Sanitizes the model props
   * @param modelProps: the incoming model props
   * @param manifest: the manifest of the model
   * @returns the model props sanitized with the manifest
   */
  #sanitizeModelProps = (modelProps: any, manifest: AIModelManifest) => {
    const props = new TypoParser(modelProps)
    return {
      model: manifest.id,
      gpuEngine: props.getEnum('gpuEngine', AIModelGpuEngine, undefined),
      topK: props.getRange('topK', manifest.config.topK),
      topP: props.getRange('topP', manifest.config.topP),
      temperature: props.getRange('temperature', manifest.config.temperature),
      repeatPenalty: props.getRange('repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: props.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(props.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: props.getBool('useMmap', true),
      grammar: props.getAny('grammar'),
      tools: props.getAny('tools')
    } as AIModelPromptProps
  }

  /* **************************************************************************/
  // MARK: LLM API handlers: Completion & Chat
  /* **************************************************************************/

  #handleExecPromptSession = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      let output = ''

      try {
        this.#activeSession.unscheduleAutoDispose()

        // Extract the options
        const payload = new TypoParser(channel.payload)
        const modelId = new AIModelId(payload.getNonEmptyString('props.model', config.defaultModels[AIModelType.Text]))
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          topK,
          topP,
          temperature,
          repeatPenalty,
          flashAttention,
          contextSize,
          useMmap,
          grammar
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)
        const sessionId = payload.getNonEmptyString('sessionId')
        const prompt = payload.getNonEmptyString('prompt')

        // Load the session
        const { session } = await this.#activeSession.loadCompletionSession(
          sessionId,
          manifest,
          { gpuEngine, useMmap },
          {
            contextSize,
            flashAttention,
            lora: manifest.formats[AIModelFormat.GGUF]?.adapter
              ? {
                adapters: [{ filePath: AIModelFileSystem.getAssetPath(manifest.formats[AIModelFormat.GGUF]?.adapter) }]
              }
              : undefined
          }
        )

        // Preflight checks
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Run the prompt
        const result = await session.generateCompletionWithMeta(prompt, {
          signal: channel.abortSignal,
          topK,
          topP,
          repeatPenalty: { penalty: repeatPenalty },
          temperature,
          onTextChunk: (chunk) => {
            channel.emit(chunk)
            output += chunk
          },
          grammar: grammar
            ? await this.#activeSession.llama.createGrammarForJsonSchema(grammar)
            : undefined,
          customStopTriggers: manifest.tokens.stop
        })

        if (process.env.NODE_ENV === 'development') {
          Logger.log('Response Completion Metadata:', result.metadata)
        }

        return output
      } catch (ex) {
        if (ex.message === 'Failed to compress chat history for context shift due to a too long prompt or system message that cannot be compressed without affecting the generation quality. Consider increasing the context size or shortening the long prompt or system message.') {
          Logger.warn('Early context shift due to long prompt or system message')
          return output
        }
        throw ex
      } finally {
        this.#activeSession.scheduleAutoDispose()
      }
    })
  }

  /**
   * Converts our internal LanguageModelMessage format to the chat history format
   * @param messages: the messages to convert
   * @returns the converted chat history
   */
  #languageModelMessagesToChatHistory = (messages: LanguageModelMessage[] | undefined): ChatHistoryItem[] | undefined => {
    if (messages === undefined) { return undefined }

    const converted: ChatHistoryItem[] = []

    for (const message of messages) {
      for (const content of message.content) {
        switch (message.role) {
          case LanguageModelMessageRole.System:
            converted.push({
              type: 'system',
              text: content.value
            } as ChatSystemMessage)
            break
          case LanguageModelMessageRole.User:
            converted.push({
              type: 'user',
              text: content.value
            } as ChatUserMessage)
            break
          case LanguageModelMessageRole.Assistant:
            converted.push({
              type: 'model',
              response: [content.value]
            } as ChatModelResponse)
            break
        }
      }
    }

    return converted
  }

  #handleExecChatSession = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      let output = ''

      try {
        this.#activeSession.unscheduleAutoDispose()

        // Extract the options
        const payload = new TypoParser(channel.payload)
        const modelId = new AIModelId(payload.getNonEmptyString('props.model', config.defaultModels[AIModelType.Text]))
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          topK,
          topP,
          temperature,
          repeatPenalty,
          flashAttention,
          contextSize,
          useMmap,
          grammar,
          prefix,
          tools
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)
        const sessionId = payload.getNonEmptyString('sessionId')
        const historyHash = payload.getNonEmptyString('historyHash', undefined)
        const history = this.#languageModelMessagesToChatHistory(payload.getAny('history', undefined))
        const prompt = ((payload.getAny('prompt') as LanguageModelMessage)?.content?.[0]?.value as string)

        // Load the session
        const { session } = await this.#activeSession.loadChatSession(
          sessionId,
          manifest,
          { gpuEngine, useMmap },
          {
            contextSize,
            flashAttention,
            lora: manifest.formats[AIModelFormat.GGUF]?.adapter
              ? {
                adapters: [{ filePath: AIModelFileSystem.getAssetPath(manifest.formats[AIModelFormat.GGUF]?.adapter) }]
              }
              : undefined
          }
        )

        // Load the previous chat history
        if (await this.#activeSession.loadChatHistory(sessionId, manifest, historyHash, history) === false) {
          return { historyRestored: false }
        }

        // Preflight checks
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Convert tools to node-llama-cpp functions format
        const functions: Record<string, any> = {}
        if (tools && tools.length > 0) {
          Logger.log(`Tools available for session ${sessionId}:`, tools.map((t: any) => t.name))

          const { defineChatSessionFunction } = await importLlama()
          for (const tool of tools) {
            functions[tool.name] = defineChatSessionFunction({
              description: tool.description || '',
              params: tool.inputSchema || {
                type: 'object',
                properties: {}
              },
              handler: async (params: any) => {
                // Generate unique ID for this tool call
                const toolCallId = `${sessionId}_${tool.name}_${Date.now()}`

                Logger.log(`Tool call requested: ${tool.name} with params:`, params)

                // Emit tool call request to extension
                channel.emit({
                  type: 'toolCall',
                  toolCallId,
                  toolCall: {
                    id: toolCallId,
                    name: tool.name,
                    arguments: params
                  }
                })

                // Wait for result from extension
                return new Promise((resolve, reject) => {
                  this.#toolCallResolvers.set(toolCallId, { resolve, reject })

                  // Set timeout to prevent hanging
                  setTimeout(() => {
                    if (this.#toolCallResolvers.has(toolCallId)) {
                      this.#toolCallResolvers.delete(toolCallId)
                      reject(new Error(`Tool call ${tool.name} timed out`))
                    }
                  }, 300000) // 5 minute timeout
                })
              }
            })
          }
        }

        // Check for grammar + tools conflict
        if (grammar && tools && tools.length > 0) {
          throw new Error('Cannot use both grammar and tools at the same time')
        }

        // Run the prompt
        const promptOptions: LLamaChatPromptOptions = {
          signal: channel.abortSignal,
          topK,
          topP,
          repeatPenalty: { penalty: repeatPenalty },
          responsePrefix: prefix,
          temperature,
          onTextChunk: (chunk) => {
            channel.emit({ type: 'chunk', data: chunk })
            output += chunk
          },
          customStopTriggers: manifest.tokens.stop
        }

        // Add either grammar or functions, but not both
        if (grammar) {
          promptOptions.grammar = await this.#activeSession.llama.createGrammarForJsonSchema(grammar)
        } else if (Object.keys(functions).length > 0) {
          promptOptions.functions = functions
        }

        const result = await session.promptWithMeta(prompt, promptOptions)

        // Persist the new chat history
        const nextHistoryHash = await this.#activeSession.saveChatHistory(sessionId, manifest)

        if (process.env.NODE_ENV === 'development') {
          Logger.log('Response Completion Metadata:', result)
        }

        return {
          historyRestored: true,
          stateDelta: { historyHash: nextHistoryHash }
        }
      } catch (ex) {
        if (ex.message === 'Failed to compress chat history for context shift due to a too long prompt or system message that cannot be compressed without affecting the generation quality. Consider increasing the context size or shortening the long prompt or system message.') {
          Logger.warn('Early context shift due to long prompt or system message')
          return output
        }
        throw ex
      } finally {
        this.#activeSession.scheduleAutoDispose()
      }
    })
  }

  #handleExecCountPromptTokens = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      try {
        // Extract the options
        const payload = new TypoParser(channel.payload)
        const modelId = new AIModelId(payload.getNonEmptyString('props.model', config.defaultModels[AIModelType.Text]))
        const input = payload.getString('input')
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          useMmap
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)

        // Load the session
        await this.#activeSession.loadModel(
          manifest,
          { gpuEngine, useMmap }
        )

        // Preflight checks
        await AIModelFileSystem.markModelUsed(modelId)
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        return this.#activeSession.model.tokenize(input).length
      } finally {
        this.#activeSession.scheduleAutoDispose()
      }
    })
  }

  /* **************************************************************************/
  // MARK: LLM API handlers: Embedding
  /* **************************************************************************/

  #handleGetEmbeddingVectors = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      try {
        // Extract the options
        const payload = new TypoParser(channel.payload)
        const modelId = new AIModelId(payload.getNonEmptyString('props.model', config.defaultModels[AIModelType.Embedding]))
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          contextSize,
          useMmap
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)
        const sessionId = payload.getNonEmptyString('sessionId')
        const inputs = payload.getStringArray('inputs')

        // Load the session
        const { context } = await this.#activeSession.loadEmbeddingSession(
          sessionId,
          manifest,
          { gpuEngine, useMmap },
          { contextSize }
        )

        // Preflight checks
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Generate the embedding
        for (const input of inputs) {
          const embedding = await context.getEmbeddingFor(input)
          channel.emit(embedding.vector)
        }

        return {}
      } finally {
        this.#activeSession.scheduleAutoDispose()
      }
    })
  }

  /* **************************************************************************/
  // MARK: LLM Lifecycle
  /* **************************************************************************/

  #handleDisposeSession = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      const sessionId = channel.payload.session
      this.#activeSession.userRequestsDisposal(sessionId)
    })
  }

  /* **************************************************************************/
  // MARK: Tool handling
  /* **************************************************************************/

  #handleToolResult = async (channel: IPCInflightChannel) => {
    const { toolCallId, result, error } = channel.payload
    const resolver = this.#toolCallResolvers.get(toolCallId)
    if (resolver) {
      this.#toolCallResolvers.delete(toolCallId)
      if (error) {
        Logger.error(`Tool call result error for ${toolCallId}:`, error)
        resolver.reject(new Error(error))
      } else {
        Logger.log(`Tool call result for ${toolCallId}:`, result)
        resolver.resolve(result)
      }
    } else {
      Logger.warn(`No resolver found for tool call ${toolCallId}`)
    }
    return { success: true }
  }
}

export default LlmSessionAPIHandler
