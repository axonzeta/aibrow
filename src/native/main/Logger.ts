import fs from 'fs-extra'
import path from 'node:path'
import sea from 'node:sea'
import * as Paths from './Paths'
import Argv from './Argv'

const kConsoleGobbleKeys = [
  'log',
  'warn',
  'error',
  'info',
  'debug'
]
const noop = () => {}

class Logger {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #queue: string[] = []
  #inflightQueue: string[] | undefined
  #queueDrainCallbacks: ((value: unknown) => void)[] = []
  #draining = false
  #_logPath: string
  #logToConsole = false
  #hasResetLog = !sea.isSea()
  #_gConsole: any

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#_gConsole = kConsoleGobbleKeys.reduce((acc, key) => {
      acc[key] = console[key]
      return acc
    }, {})
    this.#updateGlobalConsole()
  }

  /**
   * Updates the global console to pipe to noop
   */
  #updateGlobalConsole () {
    if (this.#logToConsole) {
      for (const key of kConsoleGobbleKeys) {
        console[key] = this.#_gConsole[key]
      }
    } else {
      for (const key of kConsoleGobbleKeys) {
        console[key] = noop
      }
    }
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get logPath () {
    if (!this.#_logPath) {
      if (sea.isSea()) {
        this.#_logPath = Argv.install
          ? path.join(Paths.appData, 'aibrow.log')
          : path.join(Paths.currentRuntime, 'aibrow.log')
      } else {
        this.#_logPath = path.join(path.dirname(process.env.EXEC_PATH), 'aibrow.log')
      }
      fs.ensureDirSync(path.dirname(this.#_logPath))
    }

    return this.#_logPath
  }

  get logToConsole () {
    return this.#logToConsole
  }

  set logToConsole (v: boolean) {
    this.#logToConsole = v
    this.#updateGlobalConsole()
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #serialize (args: any[]) {
    return args.map((arg) => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch (ex) {
          return arg
        }
      } else {
        return arg
      }
    }).join(' ')
  }

  /* **************************************************************************/
  // MARK: Queue
  /* **************************************************************************/

  #enqueueLog (level: string, ...args: any[]) {
    if (this.#logToConsole) {
      console.log(`[${level}] ${new Date().toISOString()} ${this.#serialize(args)}`)
    }
    this.#queue.push(`[${level}] ${new Date().toISOString()} ${this.#serialize(args)}`)
  }

  /**
   * Dequeues the log entries into a single string
   * @returns a single string to write
   */
  #dequeueLogEntries () {
    const inflight = [
      ...(this.#inflightQueue || []),
      ...this.#queue
    ]
    this.#queue = []
    this.#inflightQueue = inflight
    return inflight.join('\n')
  }

  /**
   * Executes the queue drain callbacks
   */
  #executeQueueDrainCallbacks () {
    if (this.#queueDrainCallbacks.length === 0) { return }
    const callbacks = this.#queueDrainCallbacks
    this.#queueDrainCallbacks = []
    callbacks.forEach((cb) => cb(undefined))
  }

  /**
   * Drains the log queue and writes to the log file
   */
  async #drain () {
    if (this.#draining) { return }
    if (this.#queue.length === 0) { return }

    this.#draining = true
    const logs = this.#dequeueLogEntries()

    try {
      if (!this.#hasResetLog) {
        await fs.writeFile(this.logPath, '')
        this.#hasResetLog = true
      }

      await fs.appendFile(this.logPath, `${logs}\n`)
    } finally {
      this.#inflightQueue = undefined
      this.#draining = false
      this.#executeQueueDrainCallbacks()
      this.#drain()
    }
  }

  /**
   * Drains the log queue immediately and writes to the log file
   */
  #drainImmediately () {
    if (this.#queue.length === 0 && this.#inflightQueue === undefined) { return }
    const isMidDrain = this.#draining
    this.#draining = true

    const logs = this.#dequeueLogEntries()
    fs.appendFileSync(
      this.logPath,
      isMidDrain
        ? `[WARN] Immediate log queue drain requested while already draining.\n${logs}\n`
        : `${logs}\n`
    )
    this.#inflightQueue = undefined
    this.#draining = false
    this.#executeQueueDrainCallbacks()
  }

  /* **************************************************************************/
  // MARK: Logging
  /* **************************************************************************/

  logImmediately (...args: any[]) {
    this.#enqueueLog('LOG', ...args)
    this.#drainImmediately()
  }

  log (...args: any[]) {
    this.#enqueueLog('LOG', ...args)
    this.#drain()
  }

  warn (...args: any[]) {
    this.#enqueueLog('WARN', ...args)
    this.#drain()
  }

  error (...args: any[]) {
    this.#enqueueLog('ERR', ...args)
    this.#drain()
  }

  /**
   * Waits for the queue to drain before returning
   */
  async awaitQueueDrain () {
    if (!this.#draining) { return }

    return new Promise((resolve) => {
      this.#queueDrainCallbacks.push(resolve)
    })
  }
}

export default new Logger()
