import PrompterAPIHandler from './PrompterAPIHandler'
import ModelFileSystemAPIHandler from './ModelFileSystemAPIHandler'
import ModelDownloadAPIHandler from './ModelDownloadAPIHandler'
import SystemAPIHandler from './SystemAPIHandler'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #prompter: PrompterAPIHandler
  #modelFileSystem: ModelFileSystemAPIHandler
  #modelDownload: ModelDownloadAPIHandler
  #system: SystemAPIHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    this.#prompter = new PrompterAPIHandler()
    this.#modelFileSystem = new ModelFileSystemAPIHandler()
    this.#modelDownload = new ModelDownloadAPIHandler()
    this.#system = new SystemAPIHandler()
  }
}

export default new APIHandler()
