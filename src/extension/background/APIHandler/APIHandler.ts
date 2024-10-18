import IPCServer from '#Shared/IPC/IPCServer'
import AIRewriterHandler from './AIRewriterHandler'
import AISummarizerHandler from './AISummarizerHandler'
import AIWriterHandler from './AIWriterHandler'
import AILanguageModelHandler from './AILanguageModelHandler'
import AICoreModelHandler from './AICoreModelHandler'
import { kPrefGetUseBrowserAI } from '#Shared/API/PrefIPCMessageTypes'
import { getUseBrowserAI } from '#Shared/Prefs'
import { kAIGetCapabilities } from '#Shared/API/AIIPCTypes'
import System, { NativeInstalledResult } from '../System'
import { AICapabilities } from '#Shared/API/AI'

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
      .addRequestHandler(kAIGetCapabilities, this.#handleGetCapabilities)
  }

  /* **************************************************************************/
  // MARK: Handlers: Prefs
  /* **************************************************************************/

  #handleGetUseBrowserAI = async () => {
    return await getUseBrowserAI()
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {
    return {
      helper: (await System.isNativeInstalled()) === NativeInstalledResult.Responded
    } as AICapabilities
  }
}

export default APIHandler
