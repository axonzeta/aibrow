import IPCClient from '#Shared/IPC/IPCClient'
import config from '#Shared/Config'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'

class NativeIPC {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #client: IPCClient | undefined
  #openRequests = 0
  #clientShutdown: ReturnType<typeof setTimeout>

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  disconnect () {
    if (this.#client) {
      this.#client.destroy()
      this.#client = undefined
    }
    clearTimeout(this.#clientShutdown)
  }

  /* **************************************************************************/
  // MARK: Request tracking
  /* **************************************************************************/

  async #wrapCall (fn: () => Promise<any>) {
    if (!this.#client || this.#client.destroyed) {
      const port = chrome.runtime.connectNative(config.native.identifier)
      port.name = 'native'
      this.#client = new IPCClient(port)
    }

    this.#openRequests += 1
    clearTimeout(this.#clientShutdown)

    try {
      return await fn()
    } finally {
      this.#openRequests -= 1
      if (this.#openRequests <= 0) {
        this.#openRequests = 0
        clearTimeout(this.#clientShutdown)
        this.#clientShutdown = setTimeout(() => {
          if (this.#client) {
            this.#client.destroy()
            this.#client = undefined
          }
        }, config.autoShutdownNativeClientTimeout)
      }
    }
  }

  /* **************************************************************************/
  // MARK: Requests
  /* **************************************************************************/

  async request (...args: Parameters<IPCClient['request']>) {
    return this.#wrapCall(async () => {
      return this.#client.request(...args)
    })
  }

  async stream (...args: Parameters<IPCClient['stream']>) {
    return this.#wrapCall(async () => {
      return this.#client.stream(...args)
    })
  }

  /**
   * Proxies a server channel into this client
   * @param channel: the channel to proxy
   * @return the reply
   */
  async passthroughChannel (channel: IPCInflightChannel) {
    // We can rely on the fact that request is just a subset of stream
    return await this.stream(
      channel.type,
      channel.payload,
      (chunk: string) => channel.emit(chunk),
      { signal: channel.abortSignal }
    )
  }
}

export default new NativeIPC()
