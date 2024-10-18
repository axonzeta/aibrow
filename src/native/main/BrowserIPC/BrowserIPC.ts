import IPCServer from '#Shared/IPC/IPCServer'
import BrowserPipe from './BrowserPipe'

type PortEventHandlerCallback = (message: any) => void

class PortEventHandler {
  #listeners = []

  addListener (fn: PortEventHandlerCallback) {
    this.#listeners.push(fn)
  }

  removeListener (fn: PortEventHandlerCallback) {
    const idx = this.#listeners.indexOf(fn)
    if (idx === -1) { return }
    this.#listeners.splice(idx, 1)
  }

  hasListeners () {
    return Boolean(this.#listeners.length)
  }

  hasListener (fn: PortEventHandlerCallback) {
    return this.#listeners.includes(fn)
  }

  getRules () {
    throw new Error('Not implemented')
  }

  removeRules () {
    throw new Error('Not implemented')
  }

  addRules () {
    throw new Error('Not implemented')
  }

  _exec (message: any) {
    for (const listener of this.#listeners) {
      listener(message)
    }
  }
}

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
