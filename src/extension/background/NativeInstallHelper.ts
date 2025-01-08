import System from './System'
import config from '#Shared/Config'
import { AIExtensionHelperInstalledState } from '#Shared/API/AI'

export enum NativeInstallHelperShowReason {
  Install = 'install',
  ApiUsage = 'api-usage',
  UserInteraction = 'user-interaction'
}
const singletonShowReasons = new Set([
  NativeInstallHelperShowReason.Install,
  NativeInstallHelperShowReason.ApiUsage
])

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
        if (await System.isNativeInstalled() !== AIExtensionHelperInstalledState.Responded) {
          this.show(NativeInstallHelperShowReason.Install)
        }
      }
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
  async show (reason: NativeInstallHelperShowReason) {
    if (singletonShowReasons.has(reason) && this.#shown.has(reason)) { return }
    this.#shown.add(reason)

    const url = new URL(config.extension.installHelperUrl)
    url.searchParams.set('reason', reason)
    chrome.tabs.create({ url: url.toString() })
  }
}

export const NativeInstallHelper = new NativeInstallHelperImpl()
export default NativeInstallHelper
