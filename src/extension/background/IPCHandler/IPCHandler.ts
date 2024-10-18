import IPCManagementHandler from './IPCManagementHandler'
import IPCPermissionHandler from './IPCPermissionHandler'

class IPCHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #started = false
  #management: IPCManagementHandler
  #permission: IPCPermissionHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    if (this.#started) { return }
    this.#started = true

    this.#management = new IPCManagementHandler()
    this.#permission = new IPCPermissionHandler()
  }
}

export default IPCHandler
