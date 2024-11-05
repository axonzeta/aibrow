import {
  kExtensionLibPortName
} from '#Shared/API/ContentScript'
import config from '#Shared/Config'
import { PortEventHandler } from './PortEventHandler'
import { kExtensionNotFound } from '#Shared/BrowserErrors'

export default class ExtensionLibPort {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #onMessage = new PortEventHandler()
  #onDisconnect = new PortEventHandler()
  #outbox: any[]

  #pendingPorts: Map<string, chrome.runtime.Port>
  #portTargetId: string | undefined
  #port: chrome.runtime.Port | undefined

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#outbox = []
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
    if (this.#port) {
      // Use the open port
      this.#port.postMessage(message)
    } else if (this.#portTargetId) {
      // We know which extension to use, but the port isn't open, so connect to it
      this.#port = chrome.runtime.connect(this.#portTargetId, { name: kExtensionLibPortName })
      this.#port.onDisconnect.addListener(() => {
        this.#port = undefined
        this.#onDisconnect._exec(undefined)
      })
      this.#port.onMessage.addListener((message) => {
        this.#onMessage._exec(message)
      })

      this.#port.postMessage(message)
    } else {
      // No port is setup and we're not sure who to connect to, so try all the extensions
      // We need to reach out to all ports
      if (this.#pendingPorts === undefined) {
        this.#pendingPorts = new Map()
        const extensionIds = window.location.href.startsWith('moz-extension://')
          ? config.extension.mozExtensionIds
          : window.location.href.startsWith('chrome-extension://')
            ? config.extension.crxExtensionIds
            : []

        for (const extensionId of extensionIds) {
          const port = chrome.runtime.connect(extensionId, { name: kExtensionLibPortName })
          this.#pendingPorts.set(extensionId, port)
          port.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError?.message
            if (error === kExtensionNotFound) {
              this.#pendingPorts.delete(extensionId)
            }

            if (port === this.#port) {
              this.#port = undefined
              this.#onDisconnect._exec(undefined)
            }
          })
          port.onMessage.addListener((message) => {
            if (!this.#port) {
              // Upgrade the port to the one that's connected
              this.#onMessage._exec(message)
              this.#port = port
              this.#portTargetId = extensionId

              // Dequeue all the outbox messages
              for (const message of this.#outbox) {
                this.#port.postMessage(message)
              }
              this.#outbox = []

              // Disconnect the other ports
              for (const maybePort of this.#pendingPorts.values()) {
                if (maybePort === this.#port) { continue }
                maybePort.disconnect()
              }
              this.#pendingPorts.clear()
            }

            if (this.#port === port) {
              this.#onMessage._exec(message)
            }
          })

          this.#pendingPorts.set(extensionId, port)
          port.postMessage(message)
        }
      } else {
        this.#outbox.push(message)
      }
    }
  }
}
