import IPCManagementHandler from './IPCManagementHandler'
import IPCWebHandler from './IPCWebHandler'
import IPCPermissionHandler from './IPCPermissionHandler'

class IPCHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #started = false
  #management: IPCManagementHandler
  #web: IPCWebHandler
  #permission: IPCPermissionHandler

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  start () {
    if (this.#started) { return }
    this.#started = true

    this.#management = new IPCManagementHandler()
    this.#web = new IPCWebHandler()
    this.#permission = new IPCPermissionHandler()
  }
}

export default IPCHandler
