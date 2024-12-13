import AISummarizerFactory from '#Shared/API/AISummarizer/AISummarizerFactory'
import AIWriterFactory from '#Shared/API/AIWriter/AIWriterFactory'
import AIRewriterFactory from '#Shared/API/AIRewriter/AIRewriterFactory'
import AILanguageModelFactory from '#Shared/API/AILanguageModel/AILanguageModelFactory'
import AICoreModelFactory from '#Shared/API/AICoreModel/AICoreModelFactory'
import AIEmbeddingFactory from '#Shared/API/AIEmbedding/AIEmbeddingFactory'
import AITranslatorFactory from '#Shared/API/AITranslator/AITranslatorFactory'
import AILanguageDetectorFactory from '#Shared/API/AILanguageDetector/AILanguageDetectorFactory'
import IPC from './IPC'

class WebAI extends EventTarget {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

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

  constructor () {
    super()

    this.#summarizer = new AISummarizerFactory(IPC)
    this.#writer = new AIWriterFactory(IPC)
    this.#rewriter = new AIRewriterFactory(IPC)
    this.#languageModel = new AILanguageModelFactory(IPC)
    this.#coreModel = new AICoreModelFactory(IPC)
    this.#embedding = new AIEmbeddingFactory(IPC)
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get assistant () { return this.#languageModel }

  get summarizer () { return this.#summarizer }

  get writer () { return this.#writer }

  get rewriter () { return this.#rewriter }

  get languageModel () { return this.#languageModel }

  get coreModel () { return this.#coreModel }

  get embedding () { return this.#embedding }
}

export default new WebAI()
