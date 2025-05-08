import IPCClient from '../IPC/IPCClient'

class IPCRegistrar {
  #ipc: IPCClient

  set ipc (ipc: IPCClient) {
    if (this.#ipc) { throw new Error('IPC is already registered') }
    this.#ipc = ipc
  }

  get ipc () {
    if (!this.#ipc) { throw new Error('IPC is not registered') }
    return this.#ipc
  }
}

export default new IPCRegistrar()