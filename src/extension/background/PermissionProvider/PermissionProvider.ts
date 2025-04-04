import {
  getSiteModelPermission as getSiteModelPermissionPref
} from '#Shared/Permissions/AISitePermissions'
import { PermissionRequests } from './PermissionRequests'
import config from '#Shared/Config'
import { kPermissionDenied } from '#Shared/Errors'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import AIModelDownload from '../AI/AIModelDownload'
import { AIModelFormat, AIModelManifest } from '#Shared/AIModelManifest'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import AIModelId from '#Shared/AIModelId'

class PermissionProvider {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #tabListenersBound = false
  #permissionRequests = new PermissionRequests()

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get requests () { return this.#permissionRequests }

  /* **************************************************************************/
  // MARK: Permission checks
  /* **************************************************************************/

  /**
   * @param channel: the channel making the request
   * @returns true if the port is valid for a permission check, false otherwise
   */
  #isChannelValidForPermission (channel: IPCInflightChannel) {
    if (channel.port.sender?.origin === undefined) { return false }
    if (!channel.port.sender?.tab) { return false }
    return true
  }

  /**
   * @param channel: the channel making the request
   * @returns true if the sender is an extension
   */
  #isChannelFromExtension (channel: IPCInflightChannel) {
    return (
      typeof (channel.port.sender?.origin) === 'string' &&
      channel.port.sender.origin.startsWith('chrome-extension://') &&
      typeof (channel.port.sender?.id) === 'string' &&
      channel.port.sender.id.length !== 0
    )
  }

  /**
   * Gets the model permission
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @return true if we have permission, false if not, undefined if it's undecided
   */
  async #getModelPermission (channel: IPCInflightChannel, modelId: AIModelId): Promise<boolean | undefined> {
    if (this.#isChannelFromExtension(channel)) { return true }
    if (this.#isChannelValidForPermission(channel) === false) { return false }

    // The default model might already have permission
    if (config.permissionRequiredForDefaultModel === false) {
      if (Object.values(config.defaultModels).includes(modelId.toString())) { return true }
    }

    // Check if we're a pre-allowed origin
    if (config.permissionAlwaysAllowedOrigins.includes(channel.port.sender.origin)) { return true }

    return await getSiteModelPermissionPref(channel.port.sender.origin, modelId.toString())
  }

  /**
   * Checks if a site has permission to use a model
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @return true if we have permission, false if not
   */
  async hasModelPermission (channel: IPCInflightChannel, modelId: AIModelId) {
    return await this.#getModelPermission(channel, modelId) === true
  }

  /**
   * Throws if we dont have permission to use the model
   * @param ...args: PermissionProvider.prototype.hasModelPermission
   */
  async ensureModelPermission (...args: Parameters<typeof PermissionProvider.prototype.hasModelPermission>) {
    const hasPermission = await this.hasModelPermission(...args)
    if (!hasPermission) {
      throw new Error(kPermissionDenied)
    }
  }

  /**
   * Requests permission for a model
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @returns true if we already have permission/the user grants, false otherwise
   */
  async requestModelPermission (channel: IPCInflightChannel, modelId: AIModelId) {
    if (this.#isChannelFromExtension(channel)) { return true }
    if (this.#isChannelValidForPermission(channel) === false) { return false }

    // Check the existing permission
    const permission = await this.#getModelPermission(channel, modelId)
    if (permission === true) { return true }

    // If the permission is undecided, then we should prompt
    let manifest: AIModelManifest
    try {
      manifest = await AIModelFileSystem.readModelManifest(modelId)
    } catch (ex) {
      manifest = await AIModelDownload.fetchModelManifest(modelId)
    }

    // The model doesn't support the required format
    if (!manifest.formats[AIModelFormat.GGUF]) { return false }

    const request = {
      tabId: channel.port.sender.tab.id,
      windowId: channel.port.sender.tab.windowId,
      frameId: channel.port.sender.frameId,
      origin: channel.port.sender.origin,
      modelId: modelId.toString(),
      modelName: manifest.name,
      modelLicenseUrl: manifest.formats[AIModelFormat.GGUF].licenseUrl
    }
    this.#bindTabListeners()

    if (permission === false) {
      this.#permissionRequests.add(request)
      return false
    } else {
      return new Promise((resolve, reject) => {
        this.#permissionRequests.add({ ...request, resolve, reject })
      })
    }
  }

  /* **************************************************************************/
  // MARK: Tab & Web navigation handlers
  /* **************************************************************************/

  /**
   * Binds the tab listeners
   */
  #bindTabListeners () {
    if (this.#tabListenersBound) { return }
    this.#tabListenersBound = true

    chrome.tabs.onReplaced.addListener(this.#handleTabReplaced)
    chrome.tabs.onRemoved.addListener(this.#handleTabRemoved)
    chrome.webNavigation.onBeforeNavigate.addListener(this.#handleBeforeNavigate)
  }

  /**
   * Unbinds the tab listeners
   */
  #unbindTabListeners () {
    if (!this.#tabListenersBound) { return }
    this.#tabListenersBound = false

    chrome.tabs.onReplaced.removeListener(this.#handleTabReplaced)
    chrome.tabs.onRemoved.removeListener(this.#handleTabRemoved)
    chrome.webNavigation.onBeforeNavigate.removeListener(this.#handleBeforeNavigate)
  }

  #handleTabReplaced = (addedTabId: number, removedTabId: number) => {
    if (this.#permissionRequests.deleteForTab(removedTabId)) {
      if (!this.#permissionRequests.hasRequests()) {
        this.#unbindTabListeners()
      }
    }
  }

  #handleTabRemoved = (tabId: number) => {
    if (this.#permissionRequests.deleteForTab(tabId)) {
      if (!this.#permissionRequests.hasRequests()) {
        this.#unbindTabListeners()
      }
    }
  }

  #handleBeforeNavigate = (details: chrome.webNavigation.WebNavigationParentedCallbackDetails) => {
    if (this.#permissionRequests.deleteForTabAndFrame(details.tabId, details.frameId)) {
      if (!this.#permissionRequests.hasRequests()) {
        this.#unbindTabListeners()
      }
    }
  }
}

export default new PermissionProvider()
