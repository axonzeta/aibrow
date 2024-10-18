import Config from '#Shared/Config'
import System, { NativeInstalledResult } from '../System'
import { kWebGetExtensionInstalled, kWebGetExtensionHelperInstalled } from '#Shared/BackgroundAPI/WebIPC'

class IPCManagementHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    switch (process.env.BROWSER) {
      case 'crx':
        chrome.runtime.onMessageExternal.addListener(this.#handleUntrustedWebMessage)
        break
      case 'moz':
        chrome.runtime.onMessage.addListener(this.#handleUntrustedWebMessage)
        break
    }
  }

  /* **************************************************************************/
  // MARK: Message handlers
  /* **************************************************************************/

  #handleUntrustedWebMessage = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    if (!Config.extension.installHelperOrigins.includes(sender.origin)) { return }
    switch (message.type) {
      case kWebGetExtensionInstalled:
        sendResponse({ installed: true })
        return true
      case kWebGetExtensionHelperInstalled:
        System.isNativeInstalled().then(
          (res) => sendResponse({ installed: res === NativeInstalledResult.Responded }),
          () => sendResponse({ installed: false })
        )
        return true
    }
  }
}

export default IPCManagementHandler
