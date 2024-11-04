import {
  IPCMessageType,
  IPCMessage,
  IPCOpenMessage
} from '../IPCMessages'
import { nanoid } from 'nanoid'

export type IPCInflightStreamCallback = (message: any) => void
export type IPCInflightResolve = (response: any) => void
export type IPCInflightReject = (error: Error) => void

export class IPCInflightRequest {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #id: string
  #onEmit: IPCInflightStreamCallback | undefined
  #port: chrome.runtime.Port | undefined
  #pinger: ReturnType<typeof setInterval>
  #resolve: IPCInflightResolve
  #reject: IPCInflightReject

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (onEmit: IPCInflightStreamCallback | undefined = undefined) {
    this.#id = nanoid()
    this.#onEmit = onEmit
  }

  /**
   * Opens the port for the request
   * @param port: the transport port to use
   * @param type: the request type
   * @param payload: the request arguments
   * @return the response promise
   */
  async open (port: chrome.runtime.Port, type: string, payload: any) {
    this.#port = port

    this.#port.onMessage.addListener(this.#handleMessage)
    this.#port.onDisconnect.addListener(this.#handleDisconnect)

    this.#pinger = setInterval(() => {
      this.#port?.postMessage({ id: this.#id, ipcType: IPCMessageType.clientPing, payload: null } as IPCMessage)
    }, 2500)

    return new Promise((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject

      this.#port?.postMessage({
        id: this.#id,
        ipcType: IPCMessageType.clientOpen,
        type,
        payload
      } as IPCOpenMessage)
    })
  }

  /**
   * Aborts the open request
   */
  abort () {
    this.#port?.postMessage({ id: this.#id, ipcType: IPCMessageType.clientAbort, payload: null } as IPCMessage)
    this.#reject(new Error('Aborted'))
    this.#destroy()
  }

  #destroy () {
    if (this.#port) {
      this.#port.onMessage.removeListener(this.#handleMessage)
      this.#port.onDisconnect.removeListener(this.#handleDisconnect)
      this.#port = undefined
    }
    clearInterval(this.#pinger)
  }

  /* **************************************************************************/
  // MARK: Port handlers
  /* **************************************************************************/

  #handleMessage = (message: IPCMessage) => {
    if (message.id !== this.#id) { return }

    switch (message.ipcType) {
      case IPCMessageType.serverResolve:
        this.#resolve(message.payload)
        this.#destroy()
        break
      case IPCMessageType.serverReject:
        this.#reject(new Error(`[PORT=${this.#port?.name}] ${message.payload}`))
        this.#destroy()
        break
      case IPCMessageType.serverPong:
        break
      case IPCMessageType.serverEmit:
        this.#onEmit?.(message.payload)
        break
      case IPCMessageType.serverAbort:
        this.#reject(new Error('Request aborted'))
        this.#destroy()
        break
    }
  }

  #handleDisconnect = () => {
    const lastError = chrome?.runtime?.lastError
    if (lastError && typeof (lastError.message) === 'string') {
      this.#reject(new Error(lastError.message))
    } else {
      this.#reject(new Error('Port disconnected'))
    }
    this.#destroy()
  }
}

export default IPCInflightRequest
