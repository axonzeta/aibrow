import BrowserIPC from '../BrowserIPC'
import {
  kLlmSessionGetSupportedGpuEngines,
  kLlmSessionGetModelScore,
  kLlmSessionExecPromptSession,
  kLlmSessionGetEmbeddingVector,
  kLlmSessionCountPromptTokens,
  kLlmSessionDisposePromptSession
} from '#Shared/NativeAPI/LlmSessionIPC'
import { AICapabilityGpuEngine, AIRootModelProps } from '#Shared/API/AI'
import { importLlama } from '#R/Llama'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import deepEqual from 'fast-deep-equal'
import Logger from '#R/Logger'
import config from '#Shared/Config'
import type { Llama, LlamaChatSession, LlamaContext, LlamaModel, LlamaGrammar, LlamaEmbeddingContext } from 'node-llama-cpp'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import { kModelPromptAborted } from '#Shared/Errors'
import UntrustedParser from '#Shared/API/Untrusted/UntrustedObject'
import { nanoid } from 'nanoid'
import { clamp } from '#Shared/API/Untrusted/UntrustedParser'
import { AIModelManifest } from '#Shared/AIModelManifest'
import AsyncQueue from '#Shared/AsyncQueue'

type LlmModelOptions = {
  gpuEngine: AICapabilityGpuEngine | undefined
  manifestVersion: string
  modelId: string
  contextSize: number
  useMmap: boolean
}

type LlmChatSessionOptions = {
  grammar?: any
  flashAttention: boolean
}

type LlmEmbeddingSessionOptions = object

type LlmSession = {
  options: LlmModelOptions
  model: LlamaModel
  llama: Llama
  autoDispose: ReturnType<typeof setTimeout>
  sessionIds: Set<string>
  chat?: {
    options: LlmChatSessionOptions
    context: LlamaContext
    session: LlamaChatSession
    grammar?: LlamaGrammar
  }
  embedding?: {
    options: LlmEmbeddingSessionOptions
    context: LlamaEmbeddingContext
  }
}

class LlmSessionAPIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #activeSession: LlmSession
  #requestQueue: AsyncQueue

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#requestQueue = new AsyncQueue()

    BrowserIPC
      .addRequestHandler(kLlmSessionGetSupportedGpuEngines, this.#handleGetSupportedGpuEngines)
      .addRequestHandler(kLlmSessionGetModelScore, this.#handleGetModelScore)
      .addRequestHandler(kLlmSessionExecPromptSession, this.#handleExecPromptSession)
      .addRequestHandler(kLlmSessionGetEmbeddingVector, this.#handleGetEmbeddingVector)
      .addRequestHandler(kLlmSessionCountPromptTokens, this.#handleExecCountPromptTokens)
      .addRequestHandler(kLlmSessionDisposePromptSession, this.#handleDisposePromptSession)
  }

  /* **************************************************************************/
  // MARK: Platform support
  /* **************************************************************************/

  #handleGetSupportedGpuEngines = async () => {
    const supportedEngines: AICapabilityGpuEngine[] = []
    const possibleEngines = [
      AICapabilityGpuEngine.Cuda,
      AICapabilityGpuEngine.Vulkan,
      AICapabilityGpuEngine.Cpu,
      ...process.platform === 'darwin' ? [AICapabilityGpuEngine.Metal] : []
    ]

    const { getLlamaForOptions } = await importLlama()
    for (const engine of possibleEngines) {
      try {
        await getLlamaForOptions(
          {
            gpu: engine === AICapabilityGpuEngine.Cpu ? false : engine,
            build: 'never',
            vramPadding: 0
          },
          { skipLlamaInit: true }
        )
        supportedEngines.push(engine)
      } catch (ex) { /* not supported */ }
    }

    return supportedEngines
  }

  #handleGetModelScore = async (channel: IPCInflightChannel) => {
    const props = new UntrustedParser(channel.payload)
    const gpuEngine = props.getEnum('gpuEngine', AICapabilityGpuEngine, undefined)
    const flashAttention = props.getBool('flashAttention', false)
    const contextSize = props.getNumber('contextSize', 2048)
    const modelId = props.getNonEmptyString('modelId')
    const modelUrl = props.getNonEmptyString('modelUrl')

    const { readGgufFileInfo, GgufInsights } = await importLlama()
    const llama = await this.#getLlama(gpuEngine)

    const ggufFileInfo = await readGgufFileInfo(
      modelId
        ? await (async () => {
          const manifest = await AIModelFileSystem.readModelManifest(modelId)
          return AIModelFileSystem.getAssetPath(manifest.model)
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
  // MARK: LLM session management: Loading
  /* **************************************************************************/

  /**
   * Gets a llama instance
   * @param gpuEngine: the gpu engine to use
   * @returns a new llama instance
   */
  #getLlama = async (gpuEngine: AICapabilityGpuEngine | undefined) => {
    const { getLlama } = await importLlama()
    return await getLlama({
      build: 'never',
      gpu: gpuEngine === undefined
        ? 'auto'
        : gpuEngine === AICapabilityGpuEngine.Cpu
          ? false
          : gpuEngine
    })
  }

  /**
   * Loads a model into memory
   * @param sessionId: the id of the session
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   */
  #loadLlmModel = async (sessionId: string | undefined, manifest: AIModelManifest, modelOptions: LlmModelOptions) => {
    const {
      gpuEngine,
      modelId,
      useMmap
    } = modelOptions

    // Clear the auto-dispose timer
    clearTimeout(this.#activeSession?.autoDispose)

    // Create or re-use the session
    if (deepEqual(this.#activeSession?.options, modelOptions)) {
      Logger.log(`Reusing AI model instance ${modelId}`)
      if (sessionId) {
        this.#activeSession.sessionIds.add(sessionId)
      }
    } else {
      Logger.log(`Loading new AI model instance ${modelId}`)
      this.#disposeLlmSession()

      // Prep everything for the session
      const sessionIds = new Set(sessionId ? [sessionId] : [])
      const llama = await this.#getLlama(gpuEngine)

      const model = await llama.loadModel({
        modelPath: AIModelFileSystem.getAssetPath(manifest.model),
        useMmap
      })

      this.#activeSession = {
        sessionIds,
        options: modelOptions,
        model,
        llama,
        autoDispose: undefined
      }
    }

    // Mark the model as used
    await AIModelFileSystem.markModelUsed(modelId)
  }

  /**
   * Lodas a chat session into memory
   * @param sessionId: the id of the session
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   * @param chatOptions: the options for the chat session
   */
  #loadLlmChatSession = async (
    sessionId: string | undefined,
    manifest: AIModelManifest,
    modelOptions: LlmModelOptions,
    chatOptions: LlmChatSessionOptions
  ) => {
    // Load the model
    await this.#loadLlmModel(sessionId, manifest, modelOptions)

    // Create or re-use the session
    if (deepEqual(this.#activeSession?.chat?.options, chatOptions)) {
      Logger.log(`Reusing AI chat instance ${modelOptions.modelId}`)
      this.#activeSession.chat.session.resetChatHistory()
    } else {
      Logger.log(`Loading new AI chat instance ${modelOptions.modelId}`)

      this.#disposeInteractionSessions()
      const context = await this.#activeSession.model.createContext({
        contextSize: modelOptions.contextSize,
        flashAttention: chatOptions.flashAttention,
        lora: manifest.adapter
          ? { adapters: [{ filePath: AIModelFileSystem.getAssetPath(manifest.adapter) }] }
          : undefined
      })

      const { LlamaChatSession } = await importLlama()
      const session = new LlamaChatSession({
        contextSequence: context.getSequence()
      })

      let grammar: LlamaGrammar | undefined
      if (chatOptions.grammar !== undefined) {
        grammar = await this.#activeSession.llama.createGrammarForJsonSchema(chatOptions.grammar)
      }

      this.#activeSession.chat = {
        options: chatOptions,
        context,
        session,
        grammar
      }
    }
  }

  /**
   * Lodas an embedding session into memory
   * @param sessionId: the id of the session
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   * @param embeddingOptions: the options for the embedding session
   */
  #loadLlmEmbeddingSession = async (
    sessionId: string | undefined,
    manifest: AIModelManifest,
    modelOptions: LlmModelOptions,
    embeddingOptions: LlmEmbeddingSessionOptions
  ) => {
    // Load the model
    await this.#loadLlmModel(sessionId, manifest, modelOptions)

    // Create or re-use the session
    if (deepEqual(this.#activeSession?.chat?.options, embeddingOptions)) {
      Logger.log(`Reusing AI embedding instance ${modelOptions.modelId}`)
    } else {
      Logger.log(`Loading new AI embedding instance ${modelOptions.modelId}`)

      this.#disposeInteractionSessions()
      const context = await this.#activeSession.model.createEmbeddingContext({
        contextSize: modelOptions.contextSize
      })

      this.#activeSession.embedding = {
        options: embeddingOptions,
        context
      }
    }
  }

  /* **************************************************************************/
  // MARK: LLM session management: Disposal
  /* **************************************************************************/

  /**
   * Disposes the interaction sessions from the current session
   */
  #disposeInteractionSessions () {
    this.#disposeLlmChatSession()
    this.#disposeLlmEmbeddingSession()
  }

  /**
   * Disposes of the current chat session safely
   */
  #disposeLlmChatSession () {
    if (this.#activeSession?.chat) {
      this.#activeSession.chat.session?.dispose?.()
      this.#activeSession.chat.context?.dispose?.()
      delete this.#activeSession.chat
    }
  }

  /**
   * Disposes of the current embedding session safely
   */
  #disposeLlmEmbeddingSession () {
    if (this.#activeSession?.embedding) {
      this.#activeSession.embedding?.context?.dispose?.()
      delete this.#activeSession.embedding
    }
  }

  /**
   * Disposes of the current prompt session safely
   */
  #disposeLlmSession () {
    if (this.#activeSession?.options?.modelId) {
      Logger.log(`Dispose AI instance ${this.#activeSession.options.modelId}`)
    }

    this.#disposeInteractionSessions()
    this.#activeSession?.model?.dispose?.()
    this.#activeSession = undefined
  }

  /**
   * Schedules a prompt session to be disposed
   */
  #scheduleLlmSessionDispose () {
    if (this.#activeSession) {
      clearTimeout(this.#activeSession.autoDispose)
      this.#activeSession.autoDispose = setTimeout(() => {
        this.#disposeLlmSession()
      }, config.autoDisposeModelTimeout)
    }
  }

  /* **************************************************************************/
  // MARK: LLM API handlers
  /* **************************************************************************/

  /**
   * Sanitizes the model props
   * @param modelProps: the incoming model props
   * @param manifest: the manifest of the model
   * @returns the model props sanitized with the manifest
   */
  #sanitizeModelProps = (modelProps: any, manifest: AIModelManifest) => {
    const props = new UntrustedParser(modelProps)
    return {
      model: manifest.id,
      gpuEngine: props.getEnum('gpuEngine', AICapabilityGpuEngine, undefined),
      topK: props.getRange('topK', manifest.config.topK),
      topP: props.getRange('topP', manifest.config.topP),
      temperature: props.getRange('temperature', manifest.config.temperature),
      repeatPenalty: props.getRange('repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: props.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(props.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: props.getBool('useMmap', true),
      grammar: props.getAny('grammar')
    } as AIRootModelProps
  }

  #handleExecPromptSession = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      let output = ''

      try {
        // Extract the options
        const payload = new UntrustedParser(channel.payload)
        const modelId = payload.getAIModelId('props.model')
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
        const sessionId = payload.getNonEmptyString('sessionId', nanoid())
        const prompt = payload.getNonEmptyString('prompt')

        // Load the session
        await this.#loadLlmChatSession(sessionId, manifest, {
          gpuEngine,
          manifestVersion: manifest.version,
          modelId,
          contextSize,
          useMmap
        }, {
          grammar,
          flashAttention
        })

        // Preflight checks
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Send the prompt to the model
        await this.#activeSession.chat.session.prompt(prompt, {
          signal: channel.abortSignal,
          topK,
          topP,
          repeatPenalty: { penalty: repeatPenalty },
          temperature,
          onTextChunk: (chunk) => {
            channel.emit(chunk)
            output += chunk
          },
          grammar: this.#activeSession.chat.grammar,
          customStopTriggers: manifest.tokens.stop
        })

        return output
      } catch (ex) {
        if (ex.message === 'Failed to compress chat history for context shift due to a too long prompt or system message that cannot be compressed without affecting the generation quality. Consider increasing the context size or shortening the long prompt or system message.') {
          Logger.warn('Early context shift due to long prompt or system message')
          return output
        }
        throw ex
      } finally {
        this.#scheduleLlmSessionDispose()
      }
    })
  }

  #handleGetEmbeddingVector = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      try {
        // Extract the options
        const payload = new UntrustedParser(channel.payload)
        const modelId = payload.getAIModelId('props.model')
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          contextSize,
          useMmap
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)
        const sessionId = payload.getNonEmptyString('sessionId', nanoid())
        const input = payload.getNonEmptyString('input')

        // Load the session
        await this.#loadLlmEmbeddingSession(sessionId, manifest, {
          gpuEngine,
          manifestVersion: manifest.version,
          modelId,
          contextSize,
          useMmap
        }, {})

        // Preflight checks
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Generate the embedding
        const embedding = await this.#activeSession.embedding.context.getEmbeddingFor(input)
        return embedding.vector
      } finally {
        this.#scheduleLlmSessionDispose()
      }
    })
  }

  #handleExecCountPromptTokens = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      try {
        // Extract the options
        const payload = new UntrustedParser(channel.payload)
        const modelId = payload.getAIModelId('props.model')
        const input = payload.getString('input')
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          flashAttention,
          contextSize,
          useMmap,
          grammar
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)

        // Load the session
        await this.#loadLlmChatSession(undefined, manifest, {
          gpuEngine,
          manifestVersion: manifest.version,
          modelId,
          contextSize,
          useMmap
        }, {
          grammar,
          flashAttention
        })

        // Preflight checks
        await AIModelFileSystem.markModelUsed(modelId)
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        return this.#activeSession.model.tokenize(input).length
      } finally {
        this.#scheduleLlmSessionDispose()
      }
    })
  }

  #handleDisposePromptSession = async (channel: IPCInflightChannel) => {
    return await this.#requestQueue.push(async () => {
      const sessionId = channel.payload.session
      if (this.#activeSession?.sessionIds?.has?.(sessionId)) {
        this.#activeSession.sessionIds.delete(sessionId)
        if (this.#activeSession.sessionIds.size === 0) {
          // If we fail here, the auto-dispose will get it shortly
          this.#disposeLlmSession()
        }
      }
    })
  }
}

export default LlmSessionAPIHandler
