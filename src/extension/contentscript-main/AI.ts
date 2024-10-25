import AISummarizerFactory from './AISummarizer/AISummarizerFactory'
import AIWriterFactory from './AIWriter/AIWriterFactory'
import AIRewriterFactory from './AIRewriter/AIRewriterFactory'
import AILanguageModelFactory from './AILanguageModel/AILanguageModelFactory'
import AICoreModelFactory from './AICoreModel/AICoreModelFactory'
import IPC from './IPC'
import { kAIGetCapabilities } from '#Shared/API/AIIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import { AICapabilities } from '#Shared/API/AI'
import { kExtensionNotFound } from '#Shared/BrowserErrors'

class AI extends EventTarget {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #browserAI: any
  #summarizer: AISummarizerFactory
  #writer: AIWriterFactory
  #rewriter: AIRewriterFactory
  #languageModel: AILanguageModelFactory
  #coreModel: AICoreModelFactory

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (browserAI: any) {
    super()

    this.#browserAI = browserAI
    this.#summarizer = new AISummarizerFactory(this.#browserAI)
    this.#writer = new AIWriterFactory(this.#browserAI)
    this.#rewriter = new AIRewriterFactory(this.#browserAI)
    this.#languageModel = new AILanguageModelFactory(this.#browserAI)
    this.#coreModel = new AICoreModelFactory()
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
}

export default AI
