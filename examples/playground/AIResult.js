import { Tab } from 'bootstrap'

class AIResult {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #$tab
  #$result
  #hasShownTab = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#$tab = document.getElementById('airesult-tab')
    this.#$result = document.getElementById('airesult')
  }

  /* **************************************************************************/
  // MARK: Rendering
  /* **************************************************************************/

  /**
   * Toggles the tab just one time
   */
  #maybeShowTab () {
    if (this.#hasShownTab) { return }
    this.#hasShownTab = true
    Tab.getOrCreateInstance(this.#$tab).show()
  }

  /**
   * Clears all the output
   */
  clear () {
    this.#$result.innerHTML = ''
  }

  /**
   * Adds a message to the output
   * @param type: the type (i.e. assistant, user etc)
   * @param content: the initial content
   * @return a function that can be called with new content to update the message
   */
  addMessage (type, content) {
    this.#maybeShowTab()
    const $message = document.createElement('div')
    $message.className = 'my-2'

    const $messageHeader = document.createElement('div')
    $messageHeader.innerText = type
    $messageHeader.className = 'fw-bold'
    $message.appendChild($messageHeader)

    const $messageBody = document.createElement('div')
    $messageBody.innerText = content
    $message.appendChild($messageBody)

    this.#$result.appendChild($message)
    return (content) => {
      $messageBody.innerText = content
    }
  }
}

export default new AIResult()
