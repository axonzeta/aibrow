import LlmSessionAPIHandler from './LlmSessionAPIHandler'
import ModelFileSystemAPIHandler from './ModelFileSystemAPIHandler'
import ModelDownloadAPIHandler from './ModelDownloadAPIHandler'
import SystemAPIHandler from './SystemAPIHandler'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #llmSession: LlmSessionAPIHandler
  #modelFileSystem: ModelFileSystemAPIHandler
  #modelDownload: ModelDownloadAPIHandler
  #system: SystemAPIHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    this.#llmSession = new LlmSessionAPIHandler()
    this.#modelFileSystem = new ModelFileSystemAPIHandler()
    this.#modelDownload = new ModelDownloadAPIHandler()
    this.#system = new SystemAPIHandler()
  }
}

export default new APIHandler()
