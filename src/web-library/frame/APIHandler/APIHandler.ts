import IPCServer from '#Shared/IPC/IPCServer'
import AIRewriterHandler from './AIRewriterHandler'
import AISummarizerHandler from './AISummarizerHandler'
import AIWriterHandler from './AIWriterHandler'
import AILanguageModelHandler from './AILanguageModelHandler'
import AICoreModelHandler from './AICoreModelHandler'
import AIEmbeddingHandler from './AIEmbeddingHandler'
import { kAIGetCapabilities } from '#Shared/API/AIIPCTypes'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
  #rewriterHandler: AIRewriterHandler
  #summarizerHandler: AISummarizerHandler
  #writerHandler: AIWriterHandler
  #languageModelHandler: AILanguageModelHandler
  #coreModelHandler: AICoreModelHandler
  #embeddingHandler: AIEmbeddingHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port
    this.#server = new IPCServer(port)
    this.#rewriterHandler = new AIRewriterHandler(this.#server)
    this.#summarizerHandler = new AISummarizerHandler(this.#server)
    this.#writerHandler = new AIWriterHandler(this.#server)
    this.#languageModelHandler = new AILanguageModelHandler(this.#server)
    this.#coreModelHandler = new AICoreModelHandler(this.#server)
    this.#embeddingHandler = new AIEmbeddingHandler(this.#server)

    this.#server
      .addRequestHandler(kAIGetCapabilities, this.#handleGetCapabilities)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {
    /*const nativeInstalledState = await System.isNativeInstalled()
    return {
      extension: true,
      helper: nativeInstalledState === AIHelperInstalledState.Responded,
      helperState: nativeInstalledState
    } as AICapabilities*/
  }
}

export default APIHandler
