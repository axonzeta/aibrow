import IPCServer from '#Shared/IPC/IPCServer'
import System from '../System'
import { AIExtensionCapabilities, AIExtensionHelperInstalledState } from '#Shared/API/AI'
import urlJoin from 'url-join'
import config from '#Shared/Config'
import LanguageModelHandler from './LanguageModelHandler'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
  #languageModelHandler: LanguageModelHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port
    this.#server = new IPCServer(port)
    this.#languageModelHandler = new LanguageModelHandler(this.#server)

    /*this.#server
      .addRequestHandler(kAIGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kAIGetNativeHelperDownloadUrl, this.#handleGetNativeHelperDownloadUrl)*/
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {//todo
    const nativeInstalledState = await System.isNativeInstalled()
    return {
      ready: nativeInstalledState === AIExtensionHelperInstalledState.Responded,
      extension: true,
      helper: nativeInstalledState === AIExtensionHelperInstalledState.Responded,
      helperState: nativeInstalledState
    } as AIExtensionCapabilities
  }

  #handleGetNativeHelperDownloadUrl = async () => {//todo
    const platformInfo = await chrome.runtime.getPlatformInfo()

    let platform: string
    switch (platformInfo.os) {
      case 'mac': platform = 'darwin'; break
      case 'win': platform = 'win32'; break
      default: platform = platformInfo.os; break
    }
    let arch: string
    switch (platformInfo.arch) {
      case 'arm64': arch = 'arm64'; break
      case 'x86-64': arch = 'x64'; break
    }

    const latestUrl = urlJoin(config.native.updateUrl, platform, arch, `latest_${config.native.apiVersion}.json`)
    const latestRes = await fetch(latestUrl)
    if (!latestRes.ok) { throw new Error(`Failed to fetch latest.json: ${latestRes.status}`) }
    const latest = await latestRes.json()
    return latest.download
  }
}

export default APIHandler
