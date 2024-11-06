import NativeIPC from './NativeIPC'
import {
  kSystemGetInfo,
  kSystemCheckForUpdates
} from '#Shared/NativeAPI/SystemIPC'
import { UpdateResult } from '#Shared/Updater'
import {
  getLastUpdateTime,
  setLastUpdateTime
} from '#Shared/Prefs'
import config from '#Shared/Config'
import { kNativeMessagingHostNotFound } from '#Shared/BrowserErrors'

export enum NativeInstalledResult {
  Responded,
  Errored,
  NotInstalled
}

class System {
  /* **************************************************************************/
  // MARK: Native binary
  /* **************************************************************************/

  /**
   * Gets the info about the native binary
   * @return the version
   */
  async getNativeInfo (): Promise<{ binaryVersion: string, apiVersion: string }> {
    const binaryInfo = await NativeIPC.request(kSystemGetInfo, undefined)
    return {
      binaryVersion: binaryInfo.version,
      apiVersion: binaryInfo.apiVersion
    }
  }

  /**
   * Asks the native binary to check for updates
   * @return the update result
   */
  async checkForNativeUpdates (): Promise<UpdateResult> {
    return await NativeIPC.request(kSystemCheckForUpdates, config.native.apiVersion) as UpdateResult
  }

  /**
   * Checks the native IPC for updates in the background
   */
  async backgroundCheckForNativeUpdates () {
    if (
      (Date.now() - await getLastUpdateTime() > config.updateCheckInterval) ||
      ((await this.getNativeInfo())?.apiVersion !== config.native.apiVersion)
    ) {
      switch (await this.checkForNativeUpdates()) {
        case UpdateResult.NoUpdate:
        case UpdateResult.Updated:
          await setLastUpdateTime(Date.now())
          break
      }
    }
  }

  /**
   * @return the current installed state
   */
  async isNativeInstalled (): Promise<NativeInstalledResult> {
    try {
      // We re-use the management getInfo call for this
      await this.getNativeInfo()
      return NativeInstalledResult.Responded
    } catch (ex) {
      if (ex.message === kNativeMessagingHostNotFound) {
        return NativeInstalledResult.NotInstalled
      } else {
        return NativeInstalledResult.Errored
      }
    }
  }
}

export default new System()
