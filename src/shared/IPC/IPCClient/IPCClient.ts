import {
  IPCInflightRequest,
  IPCInflightStreamCallback
} from './IPCInflightRequest'

type RequestOptions = {
  signal?: AbortSignal
}

type IPCClientOptions = {
  portReconnects?: boolean // true means when the port disconnects, it automatically reconnects when needed
}

const noop = () => {}

export class IPCClient {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #destroyed = false
  #port: chrome.runtime.Port
  #requests: Set<IPCInflightRequest> = new Set()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  /**
   * @param port: the chrome port we're connected over
   * @param opts: configuration options
   */
  constructor (
    port: chrome.runtime.Port,
    opts: IPCClientOptions = {}
  ) {
    this.#port = port

    if (opts.portReconnects !== true) {
      this.#port.onDisconnect.addListener(() => {
        this.destroy()
      })
    }
  }

  /**
   * Destroys the IPCClient
   */
  destroy () {
    this.#destroyed = true

    for (const request of [...this.#requests]) {
      try {
        request.abort()
      } catch (ex) { /* noop */ }
    }
    try {
      this.#port.disconnect()
    } catch (ex) { /* noop */ }
  }

  #guardDestroyed () {
    if (this.#destroyed) { throw new Error('IPCClient destroyed') }
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get port () { return this.#port }

  get destroyed () { return this.#destroyed }

  /* **************************************************************************/
  // MARK: Requests
  /* **************************************************************************/

  /**
   * Makes a request to the IPC channel
   * @param type: the request type
   * @param payload: the payload for the request
   * @returns the response or an error
   */
  async request (type: string, payload: any, options: RequestOptions = {}) {
    return this.stream(type, payload, noop, options)
  }

  /**
   * Makes a stream request to the IPC channel
   * @param type: the request type
   * @param payload: the payload for the request
   * @param callback: the callback for the stream
   * @returns the response or an error
   */
  async stream (type: string, payload: any, callback: IPCInflightStreamCallback, options: RequestOptions = {}) {
    this.#guardDestroyed()

    const request = new IPCInflightRequest(callback)
    this.#requests.add(request)

    if (options.signal) {
      options.signal.addEventListener('abort', () => request.abort())
    }

    const reply = await request.open(this.#port, type, payload)
    this.#requests.delete(request)
    return reply
  }
}

export default IPCClient
