import AISummarizerFactory from './AISummarizer/AISummarizerFactory'
import AIWriterFactory from './AIWriter/AIWriterFactory'
import AIRewriterFactory from './AIRewriter/AIRewriterFactory'
import AILanguageModelFactory from './AILanguageModel/AILanguageModelFactory'
import AICoreModelFactory from './AICoreModel/AICoreModelFactory'
import AIEmbeddingFactory from './AIEmbedding/AIEmbeddingFactory'
import AITranslatorFactory from './AITranslator/AITranslatorFactory'
import AILanguageDetectorFactory from './AILanguageDetector/AILanguageDetectorFactory'
import IPC from './IPC'
import {
  kAIGetCapabilities,
  kAIGetNativeHelperDownloadUrl
} from '#Shared/API/AIIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import { AICapabilities } from '#Shared/API/AI'
import { kExtensionNotFound } from '#Shared/BrowserErrors'

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
    if (process.env.BROWSER !== 'extlib') {
      const capabilities = throwIPCErrorResponse(
        await IPC.request(kAIGetCapabilities, {})
      ) as AICapabilities
      return capabilities
    } else {
      try {
        const capabilities = await IPC.request(kAIGetCapabilities, {})
        return capabilities as AICapabilities
      } catch (ex) {
        if (ex.message === kExtensionNotFound) {
          return { extension: false, helper: false } as AICapabilities
        } else {
          throw ex
        }
      }
    }
  }

  getHelperDownloadUrl = async () => {
    const url = await IPC.request(kAIGetNativeHelperDownloadUrl, {})
    return url
  }
}

export default AI
