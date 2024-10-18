import {
  IPCMessageType,
  IPCMessage,
  IPCOpenMessage
} from '../IPCMessages'

class IPCInflightChannel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port | undefined
  #id: string
  #openMessage: IPCOpenMessage
  #abortController: AbortController

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port, message: IPCOpenMessage) {
    if (message.ipcType !== IPCMessageType.clientOpen) {
      throw new Error('Failed to create IPCInflightChannel: invalid message type')
    }
    this.#port = port
    this.#id = message.id
    this.#openMessage = message
    this.#abortController = new AbortController()

    this.#port.onMessage.addListener(this.#handleMessage)
    this.#port.onDisconnect.addListener(this.#handleDisconnect)
  }

  #destroy () {
    if (this.#port) {
      this.#port.onMessage.removeListener(this.#handleMessage)
      this.#port.onDisconnect.removeListener(this.#handleDisconnect)
      this.#port = undefined
    }
  }

  #guardDestroyed () {
    if (this.#port === undefined) { throw new Error('IPCInflightChannel destroyed') }
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get type () { return this.#openMessage.type }
  get payload () { return this.#openMessage.payload }
  get abortSignal () { return this.#abortController.signal }
  get port () { return this.#port }
  get origin () { return this.#port?.sender?.origin ?? this.#port?.sender?.id }

  /* **************************************************************************/
  // MARK: Port handlers
  /* **************************************************************************/

  #handleMessage = (message: IPCMessage) => {
    switch (message.ipcType) {
      case IPCMessageType.clientAbort:
        this.#destroy()
        this.#abortController.abort()
        break
      case IPCMessageType.clientPing:
        this.#port?.postMessage({ id: this.#id, ipcType: IPCMessageType.serverPong, payload: null } as IPCMessage)
        break
    }
  }

  #handleDisconnect = () => {
    this.#destroy()
  }

  /* **************************************************************************/
  // MARK: Actions
  /* **************************************************************************/

  /**
   * Resolve the request
   * @param value: the return value
   */
  resolve (value: any) {
    if (!this.#port) { return }

    this.#port.postMessage({
      id: this.#id,
      ipcType: IPCMessageType.serverResolve,
      payload: value
    } as IPCMessage)
    this.#destroy()
  }

  /**
   * Rejects the request
   * @param error: the error to reject with
   */
  reject (error: Error | string) {
    if (!this.#port) { return }

    this.#port.postMessage({
      id: this.#id,
      ipcType: IPCMessageType.serverReject,
      payload: typeof (error) === 'string' ? error : error.message
    } as IPCMessage)
    this.#destroy()
  }

  /**
   * Emits a value to the client
   * @param value: the value to emit
   */
  emit (value: any) {
    this.#guardDestroyed()
    this.#port?.postMessage({
      id: this.#id,
      ipcType: IPCMessageType.serverEmit,
      payload: value
    } as IPCMessage)
  }

  /**
   * Aborts the request
   */
  abort () {
    if (!this.#port) { return }

    this.#port.postMessage({
      id: this.#id,
      ipcType: IPCMessageType.serverAbort,
      payload: null
    } as IPCMessage)
    this.#destroy()
  }
}

export default IPCInflightChannel
