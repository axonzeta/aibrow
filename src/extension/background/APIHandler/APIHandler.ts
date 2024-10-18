import IPCServer from '#Shared/IPC/IPCServer'
import AIRewriterHandler from './AIRewriterHandler'
import AISummarizerHandler from './AISummarizerHandler'
import AIWriterHandler from './AIWriterHandler'
import AILanguageModelHandler from './AILanguageModelHandler'
import AICoreModelHandler from './AICoreModelHandler'
import { kPrefGetUseBrowserAI } from '#Shared/API/PrefIPCMessageTypes'
import { getUseBrowserAI } from '#Shared/Prefs'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
  #rewriterHandler: AIRewriterHandler
  #summarizerHandler: AISummarizerHandler
  #writerHandler: AIWriterHandler
  #languageModel: AILanguageModelHandler
  #coreModel: AICoreModelHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port
    this.#server = new IPCServer(port)
    this.#rewriterHandler = new AIRewriterHandler(this.#server)
    this.#summarizerHandler = new AISummarizerHandler(this.#server)
    this.#writerHandler = new AIWriterHandler(this.#server)
    this.#languageModel = new AILanguageModelHandler(this.#server)
    this.#coreModel = new AICoreModelHandler(this.#server)

    this.#server
      .addRequestHandler(kPrefGetUseBrowserAI, this.#handleGetUseBrowserAI)
  }

  /* **************************************************************************/
  // MARK: Handlers: Prefs
  /* **************************************************************************/

  #handleGetUseBrowserAI = async () => {
    return await getUseBrowserAI()
  }
}

export default APIHandler
