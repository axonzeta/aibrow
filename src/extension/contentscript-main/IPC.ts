import IPCClient from '#Shared/IPC/IPCClient'
import {
  kContentScriptMessageChannel,
  kContentScriptDisconnectChannel,
  kExtensionLibPortName
} from '#Shared/API/ContentScript'
import config from '#Shared/Config'

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
  #port: chrome.runtime.Port | undefined

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    if (process.env.BROWSER === 'extlib') {
      this.#port = undefined
    } else {
      window.addEventListener('message', (evt) => {
        if (evt.source !== window) { return }
        let data: any
        try {
          data = JSON.parse(evt.data)
        } catch (ex) { return }

        switch (data.channel) {
          case kContentScriptMessageChannel:
            this.#onMessage._exec(data.message)
            break
          case kContentScriptDisconnectChannel:
            this.#onDisconnect._exec(undefined)
            break
        }
      })
    }
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
    if (process.env.BROWSER === 'extlib') {
      if (!this.#port) {
        const extensionId = window.location.href.startsWith('moz-extension://')
          ? config.extension.mozExtensionIds[0]
          : window.location.href.startsWith('chrome-extension://')
            ? config.extension.crxExtensionIds[0]
            : undefined

        this.#port = chrome.runtime.connect(extensionId, { name: kExtensionLibPortName })
        this.#port.onDisconnect.addListener(() => {
          this.#port = undefined
          this.#onDisconnect._exec(undefined)
        })
        this.#port.onMessage.addListener((message) => {
          this.#onMessage._exec(message)
        })
      }

      this.#port.postMessage(message)
    } else {
      // Stringify data for tranfer so we don't try and pass functions across
      window.postMessage(JSON.stringify({ channel: kContentScriptMessageChannel, message }), '*')
    }
  }
}

export default new IPCClient(new Port(), {
  // The port in contentscript-main automatically reconnects after it's been destroyed
  // and there's no persisted state in the background page between different ports
  portReconnects: true
})
