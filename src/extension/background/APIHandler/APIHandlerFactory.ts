import { kContentScriptPortName, kExtensionLibPortName } from '#Shared/API/ContentScript'
import APIHandler from './APIHandler'
import NativeIPC from '../NativeIPC'

class APIHandlerFactory {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: Map<chrome.runtime.Port, APIHandler> = new Map()
  #started = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    if (this.#started) { return }
    this.#started = true
    chrome.runtime.onConnect.addListener(this.#handleRuntimeConnect)
    chrome.runtime.onConnectExternal.addListener(this.#handleRuntimeConnectExternal)
  }

  /* **************************************************************************/
  // MARK: Runtime events
  /* **************************************************************************/

  #handleRuntimeConnect = (port: chrome.runtime.Port) => {
    if (port.name === kContentScriptPortName) {
      this.#handleIPCConnect(port)
    }
  }

  #handleRuntimeConnectExternal = (port: chrome.runtime.Port) => {
    if (port.name === kExtensionLibPortName) {
      this.#handleIPCConnect(port)
    }
  }

  #handleIPCConnect = (port: chrome.runtime.Port) => {
    this.#ipc.set(port, new APIHandler(port))
    port.onDisconnect.addListener(() => {
      this.#ipc.delete(port)

      if (this.#ipc.size === 0) {
        NativeIPC.disconnect()
      }
    })
  }
}

export default APIHandlerFactory
