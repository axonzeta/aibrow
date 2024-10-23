class Logger {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #$tab
  #$log
  #$count
  #count

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#$tab = document.getElementById('logger-tab')
    this.#$log = document.getElementById('logger')
    this.#$count = document.getElementById('logger-tab-count')
    this.#count = 0

    this.#$tab.addEventListener('show.bs.tab', this.#handleTabShow)
  }

  /* **************************************************************************/
  // MARK: UI Events
  /* **************************************************************************/

  #handleTabShow = () => {
    this.#count = 0
    this.#renderCount()
  }

  /* **************************************************************************/
  // MARK: Logging
  /* **************************************************************************/

  /**
   * Renders the tab count
   */
  #renderCount () {
    this.#$count.innerText = this.#count === 0 ? '' : this.#count
  }

  /**
   * Adds a log to the UI
   * @param msg: the message to log
   * @return a function that can be used to update the log
   */
  log (msg) {
    console.log(msg)
    const $el = document.createElement('div')
    $el.className = 'my-1 font-monospace'
    $el.innerText = msg
    this.#$log.appendChild($el)

    if (!this.#$tab.classList.contains('active')) {
      this.#count++
      this.#renderCount()
    }

    return (msg) => {
      console.log(msg)
      switch (typeof msg) {
        case 'boolean': {
          const $ln = document.createElement('span')
          $ln.innerText = (msg ? ' ✅' : ' ❌')
          $el.appendChild($ln)
          break
        }
        case 'object': {
          const $ln = document.createElement('pre')
          $ln.className = 'my-1 ms-2'
          $ln.innerText = JSON.stringify(msg, null, 2)
          $el.appendChild($ln)
          break
        }
        default: {
          const $ln = document.createElement('span')
          $ln.innerText = ` ${msg}`
          $el.appendChild($ln)
          break
        }
      }
    }
  }

  /**
   * Logs a function execution
   * @param msg: the message to log
   * @param fn: the function to execute. Provided with the log function to update the logs
   * @returns the result from fn()
   */
  async logTask (msg, fn) {
    return await fn(this.log(msg))
  }
}

export default new Logger()
