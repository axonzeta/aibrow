import IPCServer from '#Shared/IPC/IPCServer'
import EmbeddingHandler from './EmbeddingHandler'
import LanguageModelHandler from './LanguageModelHandler'
import RewriterHandler from './RewriterHandler'
import SummarizerHandler from './SummarizerHandler'
import WriterHandler from './WriterHandler'
import {
  kAIBrowGetCapabilities
} from '#Shared/API/AIBrowIPCTypes'
import {
  AIBrowWebCapabilities
} from '#Shared/API/AIBrowTypes'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
  #embeddingHandler: EmbeddingHandler
  #languageModelHandler: LanguageModelHandler
  #rewriterHandler: RewriterHandler
  #summarizerHandler: SummarizerHandler
  #writerHandler: WriterHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port
    this.#server = new IPCServer(port)
    this.#embeddingHandler = new EmbeddingHandler(this.#server)
    this.#languageModelHandler = new LanguageModelHandler(this.#server)
    this.#rewriterHandler = new RewriterHandler(this.#server)
    this.#summarizerHandler = new SummarizerHandler(this.#server)
    this.#writerHandler = new WriterHandler(this.#server)

    this.#server
      .addRequestHandler(kAIBrowGetCapabilities, this.#handleGetCapabilities)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {
    const gpu = Boolean((window.navigator as any).gpu)
    const cpu = typeof WebAssembly === 'object'
    return {
      ready: gpu || cpu,
      gpu,
      cpu
    } as AIBrowWebCapabilities
  }
}

export default APIHandler
