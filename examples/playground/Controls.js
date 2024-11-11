import camelCase from 'camelcase'
import { Tooltip } from 'bootstrap'

class Controls {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #$root
  #$forms
  #$allFields
  #$toolField
  #$modelField
  #$submitButton
  #$resetButton

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#$root = document.getElementById('controls')
    this.#$forms = {
      model: this.#$root.querySelector('form[name="model"]'),
      tools: {
        coreModel: this.#$root.querySelector('form[name="tool-coreModel"]'),
        languageModel: this.#$root.querySelector('form[name="tool-languageModel"]'),
        summarizer: this.#$root.querySelector('form[name="tool-summarizer"]'),
        rewriter: this.#$root.querySelector('form[name="tool-rewriter"]'),
        writer: this.#$root.querySelector('form[name="tool-writer"]')
      }
    }
    this.#$allFields = this.#$root.querySelectorAll('input, select, textarea')

    this.#$modelField = this.#$forms.model.querySelector('[name="model"]')
    this.#$toolField = this.#$forms.model.querySelector('[name="tool"]')
    this.#$submitButton = this.#$root.querySelector('[data-action="submit"]')
    this.#$resetButton = this.#$root.querySelector('[data-action="reset"]')

    this.#$toolField.addEventListener('change', this.#handleToolChanged)
    this.showTool(this.getTool())
  }

  /* **************************************************************************/
  // MARK: UI Events
  /* **************************************************************************/

  #handleToolChanged = () => {
    this.showTool(this.getTool())
  }

  /* **************************************************************************/
  // MARK: Visibility
  /* **************************************************************************/

  /**
   * Enables all the controls
   */
  enable () {
    for (const $el of this.#$allFields) {
      $el.removeAttribute('disabled')
    }
  }

  /**
   * Disables all the controls
   */
  disable () {
    for (const $el of this.#$allFields) {
      $el.setAttribute('disabled', 'disabled')
    }
  }

  /* **************************************************************************/
  // MARK: Tool filtering
  /* **************************************************************************/

  /**
   * Renders the fields for a given tool
   * @param tool: the name of the tool
   */
  showTool (tool) {
    for (const [type, $form] of Object.entries(this.#$forms.tools)) {
      if (type === tool) {
        $form.classList.remove('d-none')
      } else {
        $form.classList.add('d-none')
      }
    }
  }

  /* **************************************************************************/
  // MARK: Data
  /* **************************************************************************/

  /**
   * @returns the selected tool
   */
  getTool () {
    return this.#$toolField.value
  }

  /**
   * @returns the selected model
   */
  getModel () {
    return this.getField('model').value || undefined
  }

  /**
   * Serializes the data in the form to json
   * @param form=undefined: the name of the form or just the model form
   * @returns the form data
   */
  getData (form = undefined) {
    const data = {}
    const $form = form ? this.#$forms.tools[form] : this.#$forms.model
    for (const $el of $form.querySelectorAll('input, select, textarea')) {
      const name = $el.getAttribute('name')
      if (name) {
        let val = $el.value
        if ($el.tagName === 'INPUT') {
          switch ($el.type) {
            case 'number':
              val = parseFloat($el.value)
              if (isNaN(val)) { val = undefined }
              break
            case 'checkbox': val = $el.checked; break
          }
        }

        data[camelCase(name)] = val
      }
    }

    return data
  }

  /* **************************************************************************/
  // MARK: Fields
  /* **************************************************************************/

  /**
   * Gets the field
   * @param name: the name of the field
   * @param form=undefined: the group of fields to search
   * @return the field
   */
  getField (name, form = undefined) {
    const $form = form ? this.#$forms.tools[form] : this.#$forms.model
    return $form.querySelector(`[name="${name}"]`)
  }

  /**
   * Replaces the options in a select
   * @param name: the field name
   * @param options: the options to replace with as an object of id -> name
   * @param value: the new value
   */
  replaceSelectOptions (name, options, value) {
    const $field = this.getField(name)
    $field.replaceChildren()

    if (Array.isArray(options)) {
      options = options.reduce((acc, option) => {
        acc[option] = option
        return acc
      }, {})
    }

    for (const [id, name] of Object.entries(options)) {
      const $option = document.createElement('option')
      $option.value = id
      $option.innerText = name
      $field.appendChild($option)
    }
    $field.value = value
  }

  /* **************************************************************************/
  // MARK: Validation
  /* **************************************************************************/

  /**
   * Shows an error on a field
   * @param $field: the field dom element
   * @param error: the error string
   */
  showError ($field, error) {
    const $formGroup = $field.parentElement
    for (const $el of $formGroup.querySelectorAll('.invalid-feedback')) {
      $el.parentElement.removeChild($el)
    }

    $field.classList.add('is-invalid')
    const $error = document.createElement('div')
    $error.className = 'invalid-feedback'
    $error.innerText = error
    $formGroup.appendChild($error)
  }

  /**
   * Clears an error on a field
   * @param $field: the field dom element
   */
  clearError ($field) {
    $field.classList.remove('is-invalid')
    for (const $el of $field.parentElement.querySelectorAll('.invalid-feedback')) {
      $el.parentElement.removeChild($el)
    }
  }

  /* **************************************************************************/
  // MARK: Helpers
  /* **************************************************************************/

  /**
   * Sets a form helper for a field
   * @param $field: the dom field
   * @param helper: the helper text
   */
  setTooltip ($field, title) {
    Tooltip.getInstance($field)?.dispose?.()

    if (title) {
      new Tooltip($field, { title }) // eslint-disable-line no-new
    }
  }

  /* **************************************************************************/
  // MARK: Change events
  /* **************************************************************************/

  onSubmitClicked (fn) {
    this.#$submitButton.addEventListener('click', fn)
  }

  onResetClicked (fn) {
    this.#$resetButton.addEventListener('click', fn)
  }

  onCapabilitiesChanged (fn) {
    this.#$toolField.addEventListener('change', fn)
    this.#$modelField.addEventListener('change', fn)
  }
}

export default new Controls()
