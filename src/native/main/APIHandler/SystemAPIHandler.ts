import BrowserIPC from '../BrowserIPC'
import {
  kSystemGetInfo,
  kSystemCheckForUpdates
} from '#Shared/NativeAPI/SystemIPC'
import * as Installer from '../Installer/Updater'
import config from '#Shared/Config'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'

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

  #handleUpdateNativeBinary = async (channel: IPCInflightChannel) => {
    return await Installer.update(channel.payload as string | undefined)
  }

  #handleGetInfo = async () => {
    return {
      version: config.version,
      apiVersion: config.native.apiVersion
    }
  }
}

export default SystemAPIHandler
