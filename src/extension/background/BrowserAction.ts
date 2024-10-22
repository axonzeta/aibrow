import Config from '#Shared/Config'
import System, { NativeInstalledResult } from './System'

class BrowserAction {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #installProgress: number | null = null

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    chrome.action.onClicked.addListener(async () => {
      if (await System.isNativeInstalled() !== NativeInstalledResult.Responded) {
        chrome.tabs.create({ url: Config.extension.installHelperUrl })
      }
    })
  }

  /* **************************************************************************/
  // MARK: Installs
  /* **************************************************************************/

  /**
   * Sets the install progress
   * @param progress: the current progress
   */
  async setInstallProgress (progress: number | null) {
    const shouldOpen = progress !== null && this.#installProgress === null
    this.#installProgress = progress

    if (progress === null) {
      await chrome.action.setBadgeText({ text: null })
      console.log("setpopup null")
      await chrome.action.setPopup({ popup: '' })
    } else {
      await chrome.action.setBadgeText({ text: `${progress}%` })
      console.log("setpopup progress")
      await chrome.action.setPopup({ popup: 'install-progress-popup.html' })

      if (shouldOpen) {
        //todo firefox
        //todo - timing issue here
        const win = await chrome.windows.getLastFocused()
        console.log(">>>", win)
        switch (process.env.BROWSER) {
          case 'crx':
            // Chrome allows us to open the popup directly
            console.log("openPopup")
            chrome.action.openPopup({ windowId: win.id })//todo
            break
        }
      }
    }
  }

  /* **************************************************************************/
  // MARK: Permissions
  /* **************************************************************************/

  /**
   * Opens the permission popup for a tab
   * @param windowId: the id of the window
   * @param tabId: the id of the tab
   * @param askPermission: true to prompt for permission
   */
  async openPermissionPopup (windowId: number, tabId: number, askPermission: boolean) {
    await chrome.action.setPopup({ tabId, popup: `permission-popup.html?${new URLSearchParams({ tabId: `${tabId}` }).toString()}` })
    await chrome.action.setBadgeText({ tabId, text: '!' })

    if (askPermission) {
      switch (process.env.BROWSER) {
        case 'crx':
          // Chrome allows us to open the popup directly
          chrome.action.openPopup({ windowId })
          break
        case 'moz':
          // Firefox has a flag (extensions.openPopupWithoutUserGesture.enabled) that
          // allows extensions to open the popup without a user gesture, but as of
          // firefox 128 it is disabled by default. So we have to try and provide
          // the best experience we can
          chrome.action.openPopup({ windowId }).catch(() => {
            chrome.windows.get(windowId, (window) => {
              chrome.windows.create({
                type: 'popup',
                url: `permission-popup.html?${new URLSearchParams({ tabId: `${tabId}` }).toString()}`,
                width: 448,
                height: 220,
                left: window.left && window.width
                  ? window.left + window.width - 448
                  : undefined,
                top: window.top ?? undefined
              })
            })
          })
          break
      }
    }
  }

  /**
   * Clears a permission popup for a tab
   * @param tabId: the id of the tab
   */
  async clearPermissionPopup (tabId: number) {
    console.log("clearPermissionPopup")
    await chrome.action.setPopup({ tabId, popup: '' })
    await chrome.action.setBadgeText({ tabId, text: null })
  }
}

export default new BrowserAction()
