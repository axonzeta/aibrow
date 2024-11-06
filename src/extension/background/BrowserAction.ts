import System, { NativeInstalledResult } from './System'
import {
  AIModelManager,
  TaskType as AIModelManagerTaskType,
  InflightTaskProgressEvent as AIModelManagerProgressEvent
} from './AI/AIModelManager'
import PermissionProvider from './PermissionProvider'
import NativeInstallHelper, { NativeInstallHelperShowReason } from './NativeInstallHelper'

class BrowserAction {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #installTask: AIModelManagerProgressEvent | undefined
  #permissionRequestTabs: number[] = []

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    AIModelManager.on('task-changed', this.#handleModelTaskChanged)
    PermissionProvider.requests.on('changed', this.#handlePermissionRequestsChanged)
    chrome.action.onClicked.addListener(this.#handleBrowserActionClicked)
  }

  /* **************************************************************************/
  // MARK: Event handlers
  /* **************************************************************************/

  #handleModelTaskChanged = async (task: AIModelManagerProgressEvent) => {
    const prevTask = this.#installTask
    this.#installTask = task

    // Update the badge
    await chrome.action.setBadgeText({ text: this.#renderGlobalBadgeText() })

    // Open the install popup
    const prevOpen = prevTask?.running && prevTask?.type === AIModelManagerTaskType.Install
    const nextOpen = task.running && task.type === AIModelManagerTaskType.Install
    if (prevOpen !== nextOpen && nextOpen) {
      const window = await chrome.windows.getLastFocused()
      await this.#openPopupWithoutUserInteraction(
        window.id,
        'model-install-popup.html',
        { width: 448, height: 220 }
      )
    }
  }

  #handlePermissionRequestsChanged = async () => {
    // Update the badges
    const prevTabIds = this.#permissionRequestTabs
    const nextTabIds = PermissionProvider.requests.getTabIdsWithPermissionRequests()
    this.#permissionRequestTabs = nextTabIds
    for (const tabId of new Set([...prevTabIds, ...nextTabIds])) {
      await chrome.action.setBadgeText({ tabId, text: this.#renderTabBadgeText(tabId) })
    }

    // Open the permission popup
    if (nextTabIds.length) {
      const addedTabId = nextTabIds.find((tabId) => !prevTabIds.includes(tabId))
      if (addedTabId) {
        const tab = await chrome.tabs.get(addedTabId)
        await this.#openPopupWithoutUserInteraction(
          tab.windowId,
          `permission-popup.html?${new URLSearchParams({ tabId: `${addedTabId}` }).toString()}`,
          { width: 448, height: 200 }
        )
      }
    }
  }

  /* **************************************************************************/
  // MARK: UI Event handlers
  /* **************************************************************************/

  #handleBrowserActionClicked = async (currentTab: chrome.tabs.Tab) => {
    const { id: tabId, windowId } = currentTab

    if (await System.isNativeInstalled() !== NativeInstalledResult.Responded) {
      NativeInstallHelper.show(NativeInstallHelperShowReason.UserInteraction)
    } else if (this.#permissionRequestTabs.includes(tabId)) {
      await this.#openPopupWithUserInteraction(windowId, tabId, `permission-popup.html?${new URLSearchParams({ tabId: `${tabId}` }).toString()}`)
    } else if (this.#installTask?.running && this.#installTask?.type === AIModelManagerTaskType.Install) {
      await this.#openPopupWithUserInteraction(windowId, tabId, 'model-install-popup.html')
    } else {
      const url = chrome.runtime.getURL(chrome.runtime.getManifest().options_page)
      const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] })
      let hasOpen = false
      for (const context of contexts) {
        if (context.windowId === windowId && context.documentUrl && context.documentUrl.startsWith(url)) {
          hasOpen = true
          await chrome.tabs.update(context.tabId, { active: true })
          break
        }
      }

      if (!hasOpen) {
        await chrome.tabs.create({ url })
      }
    }
  }

  /* **************************************************************************/
  // MARK: Rendering
  /* **************************************************************************/

  /**
   * Renders the text for the badge from the current state
   * @returns the text for the badge
   */
  #renderGlobalBadgeText () {
    if (this.#installTask?.running && this.#installTask?.type === AIModelManagerTaskType.Install) {
      if (this.#installTask.progress === null) {
        return null
      } else {
        return `${this.#installTask.progress}%`
      }
    }

    return null
  }

  /**
   * Renders the badge text for a specific tab
   * @param tabId: the id of the tab
   * @return the text for the badge
   */
  #renderTabBadgeText (tabId: number) {
    if (this.#permissionRequestTabs.includes(tabId)) {
      return '!'
    }

    return null
  }

  /* **************************************************************************/
  // MARK: Popup opening
  /* **************************************************************************/

  /**
   * Opens a popup without user interaction
   * @param windowId: the id of the window to open it on
   * @param popup: the popup url to open
   */
  async #openPopupWithoutUserInteraction (windowId: number, popup: string, size: { width: number, height: number }) {
    // Firefox has a flag (extensions.openPopupWithoutUserGesture.enabled) that
    // allows extensions to open the popup without a user gesture, but as of
    // firefox 128 it is disabled by default. So we have to try and provide
    // the best experience we can
    //
    // Chrome can sometimes fail to open the popup, so fallback to creating a new window
    // in these cases
    try {
      try {
        await chrome.action.setPopup({ popup })
        await chrome.action.openPopup({ windowId })
      } finally {
        await chrome.action.setPopup({ popup: '' })
      }
    } catch (ex) {
      const win = await chrome.windows.get(windowId)
      await chrome.windows.create({
        type: 'popup',
        url: popup,
        width: size.width,
        height: size.height,
        left: win.left && win.width
          ? win.left + win.width - size.width
          : undefined,
        top: win.top ?? undefined
      })
    }
  }

  /**
   * Opens a popup in a user interaction loop
   * @param windowId: the id of the window
   * @param tabId: the id of the tab
   * @param popup: the popup url
   */
  async #openPopupWithUserInteraction (windowId: number, tabId: number, popup: string) {
    await chrome.action.setPopup({ tabId, popup })
    await chrome.action.openPopup({ windowId })
    await chrome.action.setPopup({ tabId, popup: '' })
  }
}

export default new BrowserAction()
