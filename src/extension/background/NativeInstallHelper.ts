import Config from '#Shared/Config'
import System, { NativeInstalledResult } from './System'

export enum NativeInstallHelperShowReason {
  Install = 'install',
  ApiUsage = 'api-usage'
}

class NativeInstallHelperImpl {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  // This only holds for runtime. Maybe we need to persist to storage?
  #shown = new Set<NativeInstallHelperShowReason>()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        if (await System.isNativeInstalled() !== NativeInstalledResult.Responded) {
          this.show(NativeInstallHelperShowReason.Install)
        }
      }
    })

    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({ url: Config.extension.installHelperUrl })
    })
  }

  /* **************************************************************************/
  // MARK: Display
  /* **************************************************************************/

  /**
   * Shows the install helper
   * @param reason
   * @returns
   */
  show (reason: NativeInstallHelperShowReason) {
    if (this.#shown.has(reason)) { return }
    this.#shown.add(reason)

    const url = new URL(Config.extension.installHelperUrl)
    url.searchParams.set('reason', reason)
    chrome.windows.create({
      url: url.toString(),
      type: 'popup',
      width: 400,
      height: 600
    })
  }
}

export const NativeInstallHelper = new NativeInstallHelperImpl()
export default NativeInstallHelper
