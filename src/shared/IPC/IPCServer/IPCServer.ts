import {
  IPCMessageType,
  IPCMessage,
  IPCOpenMessage
} from '../IPCMessages'
import IPCInflightChannel from './IPCInflightChannel'

type RequestHandler = (channel: IPCInflightChannel) => Promise<any>

export class IPCServer {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #port: chrome.runtime.Port
  #destroyed = false
  #requestHandlers = new Map<string, RequestHandler>()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (port: chrome.runtime.Port) {
    this.#port = port

    this.#port.onMessage.addListener(this.#handleMessage)
    this.#port.onDisconnect.addListener(this.#handleDisconnect)
  }

  #guardDestroyed () {
    if (this.#destroyed) { throw new Error('IPCServer destroyed') }
  }

  /* **************************************************************************/
  // MARK: Message handlers
  /* **************************************************************************/

  #handleMessage = async (message: IPCMessage) => {
    if (message.ipcType !== IPCMessageType.clientOpen) { return }
    const openMessage = message as IPCOpenMessage

    const handler = this.#requestHandlers.get(openMessage.type)
    if (handler) {
      const channel = new IPCInflightChannel(this.#port, openMessage)
      try {
        const res = await handler(channel)
        channel.resolve(res)
      } catch (ex) {
        channel.reject(ex)
        throw ex
      }
    }
  }

  #handleDisconnect = () => {
    this.#requestHandlers.clear()
    this.#destroyed = true
  }

  /* **************************************************************************/
  // MARK: Request handers
  /* **************************************************************************/

  /**
   * Adds a new message handler
   * @param type: the handler type
   * @param handler: the handler
   * @returns this
   */
  addRequestHandler (type: string, handler: RequestHandler) {
    this.#guardDestroyed()

    if (this.#requestHandlers.has(type)) {
      throw new Error(`Handler for type ${type} already set`)
    }
    this.#requestHandlers.set(type, handler)
    return this
  }
}

export { IPCInflightChannel }
export default IPCServer
