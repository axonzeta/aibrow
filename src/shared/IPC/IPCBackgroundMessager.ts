export type IPCSendResponseFn = (response: any) => void
export type IPCHandlerFn = (
  payload: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: IPCSendResponseFn
) => void

class IPCBackgroundMessagerImpl {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #handlerBound = false
  #handlers = new Map<string, IPCHandlerFn>()

  /* **************************************************************************/
  // MARK: Handler registration
  /* **************************************************************************/

  /**
   * Adds a new handler
   * @param type: the handler type
   * @param handler: the handler function
   * @returns this
   */
  addHandler (type: string, handler: IPCHandlerFn) {
    if (!this.#handlerBound) {
      chrome.runtime.onMessage.addListener(this.#handleRuntimeMessage)
      this.#handlerBound = true
    }
    this.#handlers.set(type, handler)

    return this
  }

  /* **************************************************************************/
  // MARK: Runtime callbacks
  /* **************************************************************************/

  #handleRuntimeMessage = (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
    // Check the message has come from a valid source
    let valid = false
    switch (process.env.BROWSER) {
      case 'crx':
        valid = sender.id === chrome.runtime.id && sender.origin === `chrome-extension://${chrome.runtime.id}`
        break
      case 'moz':
        valid = sender.id === chrome.runtime.id && sender.origin === new URL(chrome.runtime.getURL('')).origin
        break
    }
    if (!valid) { return }

    const handler = this.#handlers.get(message.type)
    if (!handler) {
      throw new Error(`IPCPageMessager has no handler for ${message.type}`)
    }
    const reply = handler(message.payload, sender, sendResponse)
    if (reply !== undefined && typeof (reply) !== 'boolean') {
      throw new Error(`IPCPageMessager has invalid handler reply ${typeof (reply)}`)
    }
    return reply
  }

  /* **************************************************************************/
  // MARK: Message sending
  /* **************************************************************************/

  /**
   * Sends a mesage, doesn't wait for a response
   * @param type: the message type
   * @param payload: the message payload
   */
  send (type: string, payload: any) {
    chrome.runtime.sendMessage({ type, payload })
  }

  /**
   * Sends a request and waits for a response
   * @param type: the message type
   * @param payload: the message payload
   * @returns the result
   */
  async request (type: string, payload: any = undefined) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(response)
        }
      })
    })
  }
}

export const IPCBackgroundMessager = new IPCBackgroundMessagerImpl()
export default IPCBackgroundMessager
