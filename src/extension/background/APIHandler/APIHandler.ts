import IPCServer from '#Shared/IPC/IPCServer'
import AIRewriterHandler from './AIRewriterHandler'
import AISummarizerHandler from './AISummarizerHandler'
import AIWriterHandler from './AIWriterHandler'
import AILanguageModelHandler from './AILanguageModelHandler'
import AICoreModelHandler from './AICoreModelHandler'
import { kPrefGetUseBrowserAI } from '#Shared/API/PrefIPCMessageTypes'
import { getUseBrowserAI } from '#Shared/Prefs'
import { kAIGetCapabilities, kAIGetNativeHelperDownloadUrl } from '#Shared/API/AIIPCTypes'
import System, { NativeInstalledResult } from '../System'
import { AICapabilities } from '#Shared/API/AI'
import urlJoin from 'url-join'
import config from '#Shared/Config'

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
      .addRequestHandler(kAIGetNativeHelperDownloadUrl, this.#handleGetNativeHelperDownloadUrl)
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
      extension: true,
      helper: (await System.isNativeInstalled()) === NativeInstalledResult.Responded
    } as AICapabilities
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
