import { importLlama } from '#R/Llama'
import { AIModelGpuEngine } from '#Shared/API/AICoreTypes'
import type {
  Llama,
  LlamaModel,
  LlamaCompletion,
  LlamaContext,
  LlamaContextOptions,
  LlamaContextSequence,
  LlamaEmbeddingContext,
  LlamaEmbeddingContextOptions,
  LlamaChatSession,
  ChatHistoryItem
} from '@aibrow/node-llama-cpp'
import { AIModelManifest, AIModelFormat } from '#Shared/AIModelManifest'
import config from '#Shared/Config'
import deepEqual from 'fast-deep-equal'
import Logger from '#R/Logger'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import AIModelId from '#Shared/AIModelId'
import { nanoid } from 'nanoid'
import objectHash from 'object-hash'

type ModelOpts = {
  gpuEngine: AIModelGpuEngine
  useMmap?: boolean
}

enum ContextType {
  None,
  Embedding,
  Completion,
  Chat
}

class LlmSession {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #llama: Llama | undefined
  #model: LlamaModel | undefined
  #modelOpts: ModelOpts | undefined
  #modelManifest: AIModelManifest | undefined

  #context: LlamaContext | LlamaContextSequence | LlamaEmbeddingContext | undefined
  #contextType: ContextType = ContextType.None
  #contextTrackingIds = new Set<string>()
  #contextOpts: LlamaContextOptions | LlamaEmbeddingContextOptions | undefined

  #session: LlamaCompletion | LlamaChatSession | undefined

  #autoDispose: ReturnType<typeof setTimeout> | undefined

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get llama () { return this.#llama }

  get model () { return this.#model }

  get context () { return this.#context }

  get session () { return this.#session }

  /* **************************************************************************/
  // MARK: Model loading
  /* **************************************************************************/

  /**
   * Gets a llama instance for the provided GPU engine
   * @param gpuEngine: the model engine
   * @returns the llama instance
   */
  async getLlama (gpuEngine: AIModelGpuEngine | undefined) {
    const { getLlama } = await importLlama()

    let gpu
    switch (gpuEngine) {
      case AIModelGpuEngine.Cuda:
      case AIModelGpuEngine.Vulkan:
      case AIModelGpuEngine.Metal:
        gpu = gpuEngine
        break
      case AIModelGpuEngine.Cpu:
        gpu = false
        break
      case undefined:
      default:
        gpu = 'auto'
        break
    }

    return await getLlama({
      build: 'never',
      gpu
    })
  }

  /**
   * Loads a model into the session or reuses an existing one if everything matches
   * @param manifest: the manifest for the model
   * @param modelOptions: the model options
   */
  async loadModel (manifest: AIModelManifest, modelOptions: ModelOpts) {
    const {
      gpuEngine,
      useMmap
    } = modelOptions

    // Preflight checks
    if (!manifest.formats[AIModelFormat.GGUF]) {
      throw new Error('Model does not support GGUF format')
    }

    // Clear the auto-dispose timer
    this.unscheduleAutoDispose()

    // Create or re-use the session
    if (deepEqual(this.#modelOpts, modelOptions) && deepEqual(this.#modelManifest, manifest)) {
      Logger.log(`Reusing AI model instance ${manifest.id}`)
    } else {
      Logger.log(`Loading new AI model instance ${manifest.id}`)
      this.dispose()

      // Prep everything for the session
      const llama = await this.getLlama(gpuEngine)

      const model = await llama.loadModel({
        modelPath: AIModelFileSystem.getAssetPath(manifest.formats[AIModelFormat.GGUF].model),
        useMmap
      })

      this.#model = model
      this.#modelOpts = modelOptions
      this.#modelManifest = manifest
      this.#llama = llama
    }

    // Mark the model as used
    await AIModelFileSystem.markModelUsed(new AIModelId(manifest.id))
  }

  /* **************************************************************************/
  // MARK: Embedding
  /* **************************************************************************/

  /**
   * Loads an embedding session into memory
   * @param trackingId: the tracking ID for the session, if any
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   * @param embeddingOptions: the options for the embedding session
   */
  loadEmbeddingSession = async (
    trackingId: string | undefined,
    manifest: AIModelManifest,
    modelOptions: ModelOpts,
    embeddingOptions: LlamaEmbeddingContextOptions
  ) => {
    // Load the model
    await this.loadModel(manifest, modelOptions)

    // Create or re-use the session
    if (this.#contextType === ContextType.Embedding && deepEqual(this.#contextOpts, embeddingOptions)) {
      Logger.log(`Reusing AI embedding instance ${manifest.id}`)
    } else {
      Logger.log(`Loading new AI embedding instance ${manifest.id}`)

      this.#disposeContextAndSession()
      if (!this.#model) { throw new Error('Model is not loaded') }
      const context = await this.#model.createEmbeddingContext(embeddingOptions)
      this.#context = context
      this.#contextType = ContextType.Embedding
      this.#contextOpts = embeddingOptions
    }

    return {
      trackingId: this.#registerTrackingId(trackingId),
      context: this.#context as LlamaEmbeddingContext
    }
  }

  /* **************************************************************************/
  // MARK: Completion
  /* **************************************************************************/

  /**
   * Loads a chat session into memory
   * @param trackingId: the tracking ID for the session, if any
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   * @param completionOptions: the options for the chat session
   */
  loadCompletionSession = async (
    trackingId: string | undefined,
    manifest: AIModelManifest,
    modelOptions: ModelOpts,
    completionOptions: LlamaContextOptions
  ) => {
    // Load the model
    await this.loadModel(manifest, modelOptions)

    // Create or re-use the session
    if (this.#contextType === ContextType.Completion && deepEqual(this.#contextOpts, completionOptions)) {
      Logger.log(`Reusing AI chat instance ${manifest.id}`)
    } else {
      Logger.log(`Loading new AI chat instance ${manifest.id}`)

      this.#disposeContextAndSession()
      if (!this.#model) { throw new Error('Model is not loaded') }
      const context = await this.#model.createContext(completionOptions)

      const { LlamaCompletion } = await importLlama()
      const session = new LlamaCompletion({
        contextSequence: context.getSequence()
      })

      this.#context = context
      this.#contextType = ContextType.Completion
      this.#contextOpts = completionOptions
      this.#session = session
    }

    return {
      trackingId: this.#registerTrackingId(trackingId),
      context: this.#context as LlamaContext,
      session: this.#session as LlamaCompletion
    }
  }

  /* **************************************************************************/
  // MARK: Chat
  /* **************************************************************************/

  /**
   * Loads a chat session into memory
   * @param trackingId: the tracking ID for the session, if any
   * @param manifest: the manifest of the model
   * @param modelOptions: the options for the model
   * @param completionOptions: the options for the chat session
   */
  loadChatSession = async (
    trackingId: string | undefined,
    manifest: AIModelManifest,
    modelOptions: ModelOpts,
    contextOptions: LlamaContextOptions
  ) => {
    if (!trackingId) {
      throw new Error('Tracking ID is required for chat sessions')
    }

    // Load the model
    await this.loadModel(manifest, modelOptions)

    // Create or re-use the session. SessionIds are used like keys in this mode
    if (
      this.#contextType === ContextType.Chat &&
      deepEqual(this.#contextOpts, contextOptions) &&
      this.#contextTrackingIds.has(trackingId) &&
      this.#contextTrackingIds.size === 1
    ) {
      Logger.log(`Reusing AI chat instance ${manifest.id}`)
    } else {
      Logger.log(`Loading new AI chat instance ${manifest.id}`)

      this.#disposeContextAndSession()
      if (!this.#model) { throw new Error('Model is not loaded') }
      const context = await this.#model.createContext(this.#contextOpts)

      const { LlamaChatSession } = await importLlama()
      const contextSequence = context.getSequence()
      const session = new LlamaChatSession({ contextSequence })

      this.#context = contextSequence
      this.#contextType = ContextType.Chat
      this.#contextOpts = contextOptions
      this.#session = session
    }

    return {
      trackingId: this.#registerTrackingId(trackingId),
      context: this.#context as LlamaContext,
      session: this.#session as LlamaChatSession
    }
  }

  /**
   * Attempts to load the chat history for the current session
   * @param trackingId: the tracking ID for the session
   * @param manifest: the manifest of the model
   * @param historyHash: the history hash, if any
   * @param history: the chat history, if any
   * @returns the history hash if the history was loaded, false if no history was found
   */
  async loadChatHistory (
    trackingId: string,
    manifest: AIModelManifest,
    historyHash: string | undefined,
    history: ChatHistoryItem[] | undefined
  ) {
    // Pre-flight checks
    if (!trackingId) { throw new Error('Tracking ID is required for chat history') }
    if (
      this.#contextTrackingIds.size !== 1 ||
      Array.from(this.#contextTrackingIds)[0] !== trackingId
    ) { throw new Error('Tracking ID does not match the current context') }
    if (!this.#session) { throw new Error('Session is not loaded') }
    if (this.#contextType !== ContextType.Chat) { throw new Error('Session is not a chat session') }
    const context = this.#context as LlamaContextSequence
    const session = this.#session as LlamaChatSession

    // Lets see if we can reuse the history or if we need to load it
    if (historyHash) {
      if (historyHash === objectHash(session.getChatHistory())) {
        // The in-memory chat history is hot. We can reuse it
        Logger.log(`Reusing in-memory chat history for ${trackingId}`)
        return historyHash
      } else {
        const savedHistory = await AIModelFileSystem.loadLLMChatContext(trackingId, manifest, historyHash, context)
        if (savedHistory !== false) {
          Logger.log(`Reusing saved chat history for ${trackingId}`)
          session.setChatHistory(savedHistory)
          return historyHash
        }
      }
    }

    if (history !== undefined) {
      // The history was provided to us
      Logger.log(`Loading chat history for ${trackingId} from provided data`)
      const newHistoryHash = objectHash(history)
      session.setChatHistory(history)
      return newHistoryHash
    }

    // We got to this point, which means we have no history to load. We'll need to ask
    // the client to send it
    Logger.log(`No chat history found for ${trackingId}`)
    return false
  }

  /**
   * Saves the chat history to disk
   * @param trackingId: the id for the session
   * @param manifest: the manifest of the model
   * @return the hash of the chat history
   */
  async saveChatHistory (
    trackingId: string,
    manifest: AIModelManifest
  ) {
    // Pre-flight checks
    if (!trackingId) { throw new Error('Tracking ID is required for chat history') }
    if (
      this.#contextTrackingIds.size !== 1 ||
      Array.from(this.#contextTrackingIds)[0] !== trackingId
    ) { throw new Error('Tracking ID does not match the current context') }
    if (!this.#session) { throw new Error('Session is not loaded') }
    if (this.#contextType !== ContextType.Chat) { throw new Error('Session is not a chat session') }
    const context = this.#context as LlamaContextSequence
    const session = this.#session as LlamaChatSession

    // Save the chat history to disk
    return await AIModelFileSystem.writeLLMChatContext(trackingId, manifest, context, session.getChatHistory())
  }

  /* **************************************************************************/
  // MARK: Tracking
  /* **************************************************************************/

  /**
   * Registers a tracking ID for the current context
   * @param trackingId: the tracking ID to register, if not provided a new one will be generated
   * @return the tracking ID that was registered
   */
  #registerTrackingId (trackingId = nanoid()) {
    this.#contextTrackingIds.add(trackingId)
    return trackingId
  }

  /* **************************************************************************/
  // MARK: Disposal
  /* **************************************************************************/

  /**
   * Schedules an auto-dispose of the session
   */
  scheduleAutoDispose () {
    this.unscheduleAutoDispose()
    this.#autoDispose = setTimeout(() => {
      this.dispose()
    }, config.autoDisposeModelTimeout)
  }

  /**
   * Unschedules an auto-dispose of the session
   */
  unscheduleAutoDispose () {
    clearTimeout(this.#autoDispose)
    this.#autoDispose = undefined
  }

  /**
   * Disposes the current context and session, if they exist
   */
  #disposeContextAndSession () {
    this.#session?.dispose()
    this.#session = undefined

    this.#context?.dispose()
    this.#contextTrackingIds.clear()
    this.#contextType = ContextType.None
    this.#contextOpts = undefined
    this.#context = undefined
  }

  /**
   * Disposes the current model and llama instance, if they exist
   */
  #disposeModel () {
    this.#model?.dispose()
    this.#modelOpts = undefined
    this.#model = undefined

    this.#llama?.dispose()
    this.#llama = undefined
  }

  /**
   * Disposes all the resources used by the session
   */
  dispose () {
    Logger.log('Disposing LLM session')
    this.#disposeContextAndSession()
    this.#disposeModel()
    this.unscheduleAutoDispose()
  }

  /**
   * User requests session disposal, only disposes if there are no active tracking IDs
   */
  userRequestsDisposal (trackingId: string) {
    if (!trackingId) { return }
    if (!this.#contextTrackingIds.has(trackingId)) { return }

    this.#contextTrackingIds.delete(trackingId)
    if (this.#contextType !== ContextType.Chat) {
      AIModelFileSystem.removeLLMChatContext(trackingId)
    }

    if (this.#contextTrackingIds.size === 0) {
      // If we have no active tracking IDs, we can dispose the session
      // If we fail here, the auto-dispose will get it shortly
      this.dispose()
    }
  }
}

export default LlmSession
