import IPCServer from '#Shared/IPC/IPCServer'
import System from '../System'
import {
  AIBrowExtensionCapabilities,
  AIBrowExtensionHelperInstalledState
} from '#Shared/API2/AIBrowTypes'
import urlJoin from 'url-join'
import config from '#Shared/Config'
import LanguageModelHandler from './LanguageModelHandler'
import RewriterHandler from './RewriterHandler'
import SummarizerHandler from './SummarizerHandler'
import WriterHandler from './WriterHandler'
import {
  kAIBrowGetCapabilities,
  kAIBrowGetNativeHelperDownloadUrl
} from '#Shared/API2/AIBrowIPCTypes'
import {
  TRANS_AIExtensionHelperInstalledState_To_AIBrow
} from '#Shared/API2/Transition'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
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
    this.#languageModelHandler = new LanguageModelHandler(this.#server)
    this.#rewriterHandler = new RewriterHandler(this.#server)
    this.#summarizerHandler = new SummarizerHandler(this.#server)
    this.#writerHandler = new WriterHandler(this.#server)

    this.#server
      .addRequestHandler(kAIBrowGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kAIBrowGetNativeHelperDownloadUrl, this.#handleGetNativeHelperDownloadUrl)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {
    const nativeInstalledState = TRANS_AIExtensionHelperInstalledState_To_AIBrow(await System.isNativeInstalled())
    return {
      ready: nativeInstalledState === AIBrowExtensionHelperInstalledState.Responded,
      extension: true,
      helper: nativeInstalledState === AIBrowExtensionHelperInstalledState.Responded,
      helperState: nativeInstalledState
    } as AIBrowExtensionCapabilities
  }

  #handleGetNativeHelperDownloadUrl = async () => {
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
