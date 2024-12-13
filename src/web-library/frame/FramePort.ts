import { PortEventHandler } from '#Shared/IPC/PortEventHandler'
import {
  kFrameMessageChannel
} from '#Shared/IPC/FrameIPC'

class FramePort {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #frameId: string
  #onMessage = new PortEventHandler()
  #onDisconnect = new PortEventHandler()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    const qs = new URLSearchParams(window.location.search)
    this.#frameId = qs.get('frameId')
    if (!this.#frameId) {
      throw new Error('Frame ID not found')
    }

    window.addEventListener('message', (evt) => {
      if (evt.source !== window.parent) { return }
      let data: any
      try {
        data = JSON.parse(evt.data)
      } catch (ex) { return }
      if (data.frameId !== this.#frameId) { return }

      switch (data.channel) {
        case kFrameMessageChannel:
          this.#onMessage._exec(data.message)
          break
      }
    })
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
    window.parent.postMessage(JSON.stringify({
      channel: kFrameMessageChannel,
      frameId: this.#frameId,
      message
    }), '*')
  }
}

export default FramePort
