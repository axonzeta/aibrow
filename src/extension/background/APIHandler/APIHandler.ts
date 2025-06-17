import IPCServer from '#Shared/IPC/IPCServer'
import System from '../System'
import {
  AIBrowExtensionCapabilities,
  AIBrowExtensionHelperInstalledState
} from '#Shared/API/AIBrowTypes'
import urlJoin from 'url-join'
import config from '#Shared/Config'
import EmbeddingHandler from './EmbeddingHandler'
import LanguageDetectorHandler from './LanguageDetectorHandler'
import LanguageModelHandler from './LanguageModelHandler'
import RewriterHandler from './RewriterHandler'
import SummarizerHandler from './SummarizerHandler'
import TranslatorHandler from './TranslatorHandler'
import WriterHandler from './WriterHandler'
import {
  kAIBrowGetCapabilities,
  kAIBrowGetNativeHelperDownloadUrl
} from '#Shared/API/AIBrowIPCTypes'

class APIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #server: IPCServer
  #embeddingHandler: EmbeddingHandler
  #languageDetectorHandler: LanguageDetectorHandler
  #languageModelHandler: LanguageModelHandler
  #rewriterHandler: RewriterHandler
  #summarizerHandler: SummarizerHandler
  #translatorHandler: TranslatorHandler
  #writerHandler: WriterHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port
    this.#server = new IPCServer(port)
    this.#embeddingHandler = new EmbeddingHandler(this.#server)
    this.#languageDetectorHandler = new LanguageDetectorHandler(this.#server)
    this.#languageModelHandler = new LanguageModelHandler(this.#server)
    this.#rewriterHandler = new RewriterHandler(this.#server)
    this.#summarizerHandler = new SummarizerHandler(this.#server)
    this.#translatorHandler = new TranslatorHandler(this.#server)
    this.#writerHandler = new WriterHandler(this.#server)

    this.#server
      .addRequestHandler(kAIBrowGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kAIBrowGetNativeHelperDownloadUrl, this.#handleGetNativeHelperDownloadUrl)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async () => {
    const nativeInstalledState = await System.isNativeInstalled()
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
    switch (platformInfo.arch as chrome.runtime.PlatformArch | 'aarch64') {
      case 'arm64':
      case 'aarch64': // Firefox comes out with this value on AppleSilicon
      case 'arm':
        arch = 'arm64'
        break
      case 'x86-64':
        arch = 'x64'
        break
    }

    const latestUrl = urlJoin(config.native.updateUrl, platform, arch, `latest_${config.native.apiVersion}.json`)
    const latestRes = await fetch(latestUrl)
    if (!latestRes.ok) { throw new Error(`Failed to fetch latest.json: ${latestRes.status}`) }
    const latest = await latestRes.json()
    return latest.download
  }
}

export default APIHandler
