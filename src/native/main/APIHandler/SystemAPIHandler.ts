import BrowserIPC from '../BrowserIPC'
import {
  kSystemGetInfo,
  kSystemCheckForUpdates
} from '#Shared/NativeAPI/SystemIPC'
import * as Installer from '../Installer/Updater'
import config from '#Shared/Config'

class SystemAPIHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kSystemCheckForUpdates, this.#handleUpdateNativeBinary)
      .addRequestHandler(kSystemGetInfo, this.#handleGetInfo)
  }

  /* **************************************************************************/
  // MARK: Request handlers
  /* **************************************************************************/

  #handleUpdateNativeBinary = async () => {
    return await Installer.update()
  }

  #handleGetInfo = async () => {
    return { version: config.version }
  }
}

export default SystemAPIHandler
