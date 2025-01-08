import AISummarizerFactory from '#Shared/API/AISummarizer/AISummarizerFactory'
import AIWriterFactory from '#Shared/API/AIWriter/AIWriterFactory'
import AIRewriterFactory from '#Shared/API/AIRewriter/AIRewriterFactory'
import AILanguageModelFactory from '#Shared/API/AILanguageModel/AILanguageModelFactory'
import AICoreModelFactory from '#Shared/API/AICoreModel/AICoreModelFactory'
import AIEmbeddingFactory from '#Shared/API/AIEmbedding/AIEmbeddingFactory'
import AITranslatorFactory from '#Shared/API/AITranslator/AITranslatorFactory'
import AILanguageDetectorFactory from '#Shared/API/AILanguageDetector/AILanguageDetectorFactory'
import IPC from './IPC'
import {
  kAIGetCapabilities,
  kAIGetNativeHelperDownloadUrl
} from '#Shared/API/AIIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import { AIExtensionCapabilities } from '#Shared/API/AI'

class AI extends EventTarget {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #browserAI: globalThis.AI | undefined
  #summarizer: AISummarizerFactory
  #writer: AIWriterFactory
  #rewriter: AIRewriterFactory
  #languageModel: AILanguageModelFactory
  #coreModel: AICoreModelFactory
  #embedding: AIEmbeddingFactory
  #translator: AITranslatorFactory
  #languageDetector: AILanguageDetectorFactory

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (browserAI: globalThis.AI | undefined) {
    super()

    this.#browserAI = browserAI
    this.#summarizer = new AISummarizerFactory(IPC)
    this.#writer = new AIWriterFactory(IPC)
    this.#rewriter = new AIRewriterFactory(IPC)
    this.#languageModel = new AILanguageModelFactory(IPC)
    this.#coreModel = new AICoreModelFactory(IPC)
    this.#embedding = new AIEmbeddingFactory(IPC)
    this.#translator = new AITranslatorFactory(IPC)
    this.#languageDetector = new AILanguageDetectorFactory(IPC)
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get browserAI () { return this.#browserAI }

  get aibrow () { return true }

  get assistant () { return this.#languageModel }

  get summarizer () { return this.#summarizer }

  get writer () { return this.#writer }

  get rewriter () { return this.#rewriter }

  get languageModel () { return this.#languageModel }

  get coreModel () { return this.#coreModel }

  get embedding () { return this.#embedding }

  get translator () { return this.#translator }

  get languageDetector () { return this.#languageDetector }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async () => {
    const capabilities = throwIPCErrorResponse(
      await IPC.request(kAIGetCapabilities, {})
    ) as AIExtensionCapabilities
    return capabilities
  }

  getHelperDownloadUrl = async () => {
    const url = await IPC.request(kAIGetNativeHelperDownloadUrl, {})
    return url
  }
}

export default AI
