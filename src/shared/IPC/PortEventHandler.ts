export type PortEventHandlerCallback = (message: any) => void

export class PortEventHandler {
  #listeners: PortEventHandlerCallback[] = []

  addListener (fn: PortEventHandlerCallback) {
    this.#listeners.push(fn)
  }

  removeListener (fn: PortEventHandlerCallback) {
    const idx = this.#listeners.indexOf(fn)
    if (idx === -1) { return }
    this.#listeners.splice(idx, 1)
  }

  hasListeners () {
    return Boolean(this.#listeners.length)
  }

  hasListener (fn: PortEventHandlerCallback) {
    return this.#listeners.includes(fn)
  }

  getRules () {
    throw new Error('Not implemented')
  }

  removeRules () {
    throw new Error('Not implemented')
  }

  addRules () {
    throw new Error('Not implemented')
  }

  _exec (message: any) {
    for (const listener of this.#listeners) {
      listener(message)
    }
  }
}
