import { EventEmitter } from 'events'
import Logger from '../Logger'

const MAX_OUT_MESSAGE_BYTES = 1000000 // 1MB

class BrowserPipe extends EventEmitter {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #incomingBuffer: Buffer
  #incomingMessageSize: number | undefined

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    super()

    this.#incomingBuffer = Buffer.alloc(0)

    // Pause the pipe until everything is setup in the code to handle requests
    process.stdin.pause()
    process.stdin.on('data', this.#handleStdinData)
    process.stdin.on('end', this.#handleStdinEnd)
  }

  start () {
    process.stdin.resume()
  }

  /* **************************************************************************/
  // MARK: Stdin events
  /* **************************************************************************/

  #handleStdinData = (newData: Buffer) => {
    this.#incomingBuffer = Buffer.concat([this.#incomingBuffer, newData])
    this.#processIncomingBuffer()
  }

  #handleStdinEnd = () => {
    this.#incomingMessageSize = undefined
  }

  #processIncomingBuffer () {
    // Messages are prefix with a 32-bit message length. Make sure these are read out
    if (this.#incomingMessageSize === undefined) {
      if (this.#incomingBuffer.length < 4) { return }
      this.#incomingMessageSize = this.#incomingBuffer.readUInt32LE(0)
      this.#incomingBuffer = this.#incomingBuffer.subarray(4)
    }

    // Read the message, convert to json and emit
    if (this.#incomingBuffer.length >= this.#incomingMessageSize) {
      const messageBuffer = this.#incomingBuffer.subarray(0, this.#incomingMessageSize)
      this.#incomingBuffer = this.#incomingBuffer.subarray(this.#incomingMessageSize)
      this.#incomingMessageSize = undefined

      const dataString = messageBuffer.toString('utf8')
      let jsonData: any
      try {
        jsonData = JSON.parse(dataString)
      } catch (ex) {
        Logger.error('Failed to parse incoming JSON:', dataString, ex)
      }

      if (jsonData) {
        if (process.env.NODE_ENV === 'development') {
          Logger.log('> MSG', jsonData)
        }

        this.emit('message', jsonData)
      }
    }

    // We might have more to process
    if (this.#incomingBuffer.length) {
      this.#processIncomingBuffer()
    }
  }

  /* **************************************************************************/
  // MARK: Message writing
  /* **************************************************************************/

  /**
   * Sends a message to the browser
   * @param data: the data to send
   */
  postMessage (data: any) {
    // Serialize the data
    const dataBuffer = Buffer.from(JSON.stringify(data), 'utf8')
    if (dataBuffer.byteLength > MAX_OUT_MESSAGE_BYTES) { // 1MB
      throw new Error(`Cannot send message to browser, too large: ${dataBuffer.byteLength} > ${MAX_OUT_MESSAGE_BYTES}`)
    }

    if (process.env.NODE_ENV === 'development') {
      Logger.log('< MSG', data)
    }
    // Prefix the message length and send
    const lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32LE(dataBuffer.length, 0)
    process.stdout.write(Buffer.concat([lengthBuffer, dataBuffer]))
  }
}

export default new BrowserPipe()
