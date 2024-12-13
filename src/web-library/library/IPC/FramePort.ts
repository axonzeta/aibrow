import {
  kFrameMessageChannel,
  kFrameDisconnectChannel
} from '#Shared/IPC/FrameIPC'
import { PortEventHandler } from '#Shared/IPC/PortEventHandler'
import { nanoid } from 'nanoid'
import config from '#Shared/Config'

export default class FramePort {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #frame: HTMLIFrameElement
  #frameId: string
  #onMessage = new PortEventHandler()
  #onDisconnect = new PortEventHandler()
  #outbox: any[] = []

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    (async () => {
      // Initialize the frame
      const frameId = nanoid()
      const url = new URL("http://localhost:8080/out/web-library-frame/")
      url.searchParams.set('frameId', frameId)
      url.searchParams.set('version', config.version)
      const frame = document.createElement('iframe')
      frame.style.display = 'none'
      frame.src = url.toString()

      // Append to our body
      if (document.body) {
        document.body.appendChild(frame)
      } else {
        await new Promise((resolve) => {
          document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(frame)
            resolve(undefined)
          })
        })
      }

      //  Wait for the frame to load
      await new Promise((resolve, reject) => {
        frame.onload = () => { resolve(undefined) }
        frame.onerror = (evt) => { reject(evt) }
      })

      // Bind the listeners
      window.addEventListener('message', (evt) => {
        if (evt.source !== this.#frame.contentWindow) { return }
        let data: any
        try {
          data = JSON.parse(evt.data)
        } catch (ex) { return }
        if (data.frameId !== frameId) { return }

        switch (data.channel) {
          case kFrameMessageChannel:
            this.#onMessage._exec(data.message)
            break
          case kFrameDisconnectChannel:
            this.#onDisconnect._exec(undefined)
            break
        }
      })
      this.#frame = frame
      this.#frameId = frameId

      // Dequeue any messages
      this.#flushMessages()
    })()
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

  #flushMessages () {
    if (!this.#outbox.length) { return }
    if (!this.#frame.contentWindow) { return }

    const messages = this.#outbox
    this.#outbox = []
    for (const message of messages) {
      this.#frame.contentWindow.postMessage(JSON.stringify({
        channel: kFrameMessageChannel,
        frameId: this.#frameId,
        message
      }), '*')
    }
  }

  postMessage (message: any) {
    this.#outbox.push(message)
    this.#flushMessages()
  }
}
