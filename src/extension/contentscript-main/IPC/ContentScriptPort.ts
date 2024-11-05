import {
  kContentScriptMessageChannel,
  kContentScriptDisconnectChannel
} from '#Shared/API/ContentScript'
import { PortEventHandler } from './PortEventHandler'

export default class ContentScriptPort {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #onMessage = new PortEventHandler()
  #onDisconnect = new PortEventHandler()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
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
    window.postMessage(JSON.stringify({ channel: kContentScriptMessageChannel, message }), '*')
  }
}
