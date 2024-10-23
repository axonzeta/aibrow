import { Toast } from 'bootstrap'

class ModelDownload {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #$toast
  #toast
  #$modelName
  #$progress
  #shown = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#$toast = document.getElementById('model-download-toast')
    this.#$modelName = this.#$toast.querySelector('[data-render="model-name"]')
    this.#$progress = this.#$toast.querySelector('[data-render="progress"]')

    this.#toast = new Toast(this.#$toast, { autohide: false })
  }

  /* **************************************************************************/
  // MARK: Monitors
  /* **************************************************************************/

  /**
   * Creates a new monitor
   * @param fn: async function to execute with the monitor
   * @return the result from fn()
   */
  async createMonitor (fn) {
    const monitor = (m) => {
      m.addEventListener('downloadprogress', (evt) => {
        if (!this.#shown) {
          this.#shown = true
          this.#toast.show()
        }
        const percent = `${Math.round(evt.loaded / evt.total * 100)}%`

        this.#$modelName.innerText = evt.model
        this.#$progress.style.width = percent
        this.#$progress.innerText = percent
      })
    }

    try {
      return await fn(monitor)
    } finally {
      this.#shown = false
      this.#toast.hide()
    }
  }
}

export default new ModelDownload()
