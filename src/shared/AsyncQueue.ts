type Task = () => Promise<any>

class AsyncQueue {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #running: boolean
  #tasks: Array<() => Promise<void>>

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#running = false
    this.#tasks = []
  }

  /* **************************************************************************/
  // MARK: Dequeue
  /* **************************************************************************/

  async #execNextTask () {
    if (this.#running) { return }
    if (this.#tasks.length === 0) { return }

    try {
      this.#running = true
      const task = this.#tasks.shift()
      if (task) {
        await task()
      }
    } finally {
      this.#running = false
      setTimeout(() => this.#execNextTask(), 1)
    }
  }

  /* **************************************************************************/
  // MARK: Exec
  /* **************************************************************************/

  async push (fn: Task) {
    return new Promise((resolve, reject) => {
      this.#tasks.push(async () => {
        try {
          resolve(await fn())
        } catch (ex) {
          reject(ex)
        }
      })

      this.#execNextTask()
    })
  }
}

export default AsyncQueue
