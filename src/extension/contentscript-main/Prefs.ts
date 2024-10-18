import IPC from './IPC'
import { kPrefGetUseBrowserAI } from '#Shared/API/PrefIPCMessageTypes'

class Prefs {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #cachedUseBrowserAI: boolean | null = null

  /* **************************************************************************/
  // MARK: Getters
  /* **************************************************************************/

  async getUseBrowserAI () {
    if (typeof (this.#cachedUseBrowserAI) !== 'boolean') {
      this.#cachedUseBrowserAI = (await IPC.request(kPrefGetUseBrowserAI, {}) as boolean)
    }

    return this.#cachedUseBrowserAI
  }
}

export default new Prefs()
