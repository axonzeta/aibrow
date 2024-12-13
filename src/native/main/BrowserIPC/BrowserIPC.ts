import IPCServer from '#Shared/IPC/IPCServer'
import BrowserPipe from './BrowserPipe'
import { PortEventHandler } from '#Shared/IPC/PortEventHandler'

class Port {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #onMessage = new PortEventHandler()
  #onDisconnect = new PortEventHandler()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserPipe.on('message', (message: any) => {
      this.#onMessage._exec(message)
    })
    BrowserPipe.start()
  }

  disconnect () {
    throw new Error('Not implemented')
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get name () { return undefined }

  get onMessage () { return this.#onMessage }

  get onDisconnect () { return this.#onDisconnect }

  /* **************************************************************************/
  // MARK: Sending
  /* **************************************************************************/

  postMessage (message: any) {
    BrowserPipe.postMessage(message)
  }
}

export default new IPCServer(new Port())
