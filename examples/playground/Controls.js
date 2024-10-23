import camelCase from 'camelcase'

class Controls {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #$root
  #$tool
  #$model
  #$fields
  #$submit
  #$reset

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#$root = document.getElementById('controls')
    this.#$model = this.#$root.querySelector('[name="model"]')
    this.#$tool = this.#$root.querySelector('[name="tool"]')
    this.#$fields = this.#$root.querySelectorAll('input, button, textarea, select')
    this.#$submit = this.#$root.querySelector('[data-action="submit"]')
    this.#$reset = this.#$root.querySelector('[data-action="reset"]')

    this.#$tool.addEventListener('change', this.#handleToolChanged)
    this.#renderTool(this.getTool())
  }

  /* **************************************************************************/
  // MARK: UI Events
  /* **************************************************************************/

  #handleToolChanged = () => {
    this.#renderTool(this.getTool())
  }

  /* **************************************************************************/
  // MARK: Visibility
  /* **************************************************************************/

  /**
   * Enables all the controls
   */
  enable () {
    for (const $el of this.#$fields) {
      $el.removeAttribute('disabled')
    }
  }

  /**
   * Disables all the controls
   */
  disable () {
    for (const $el of this.#$fields) {
      $el.setAttribute('disabled', 'disabled')
    }
  }

  /* **************************************************************************/
  // MARK: Tool filtering
  /* **************************************************************************/

  #fieldIsForTool (tool, $el) {
    if ($el.hasAttribute('data-tool')) {
      const validTools = $el.getAttribute('data-tool').split(' ')
      return validTools.includes(tool)
    }
    return true
  }

  /**
   * Renders the fields for a given tool
   * @param tool: the name of the tool
   */
  #renderTool (tool) {
    for (const $el of this.#$root.querySelectorAll('[data-tool]')) {
      if (this.#fieldIsForTool(tool, $el)) {
        $el.closest('[data-form-group="true"]').classList.remove('d-none')
      } else {
        $el.closest('[data-form-group="true"]').classList.add('d-none')
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
    return this.#$tool.value
  }

  /**
   * @returns the selected model
   */
  getModel () {
    return this.getField('model').value || undefined
  }

  /**
   * Serializes the data in the form to json
   * @param group=undefined: the group of fields to serialize
   * @returns the form data
   */
  getData (group = undefined) {
    const data = {}
    const tool = this.getTool()
    for (const $el of this.#$fields) {
      const name = $el.getAttribute('name')
      if (
        name &&
        this.#fieldIsForTool(tool, $el) &&
        (group && $el.getAttribute('data-group') === group)
      ) {
        let val = $el.value
        if ($el.tagName === 'INPUT') {
          switch ($el.type) {
            case 'number': val = parseFloat($el.value); break
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
   * @return the field
   */
  getField (name) {
    return this.#$root.querySelector(`[name="${name}"]`)
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
  // MARK: Change events
  /* **************************************************************************/

  onSubmitClicked (fn) {
    this.#$submit.addEventListener('click', fn)
  }

  onResetClicked (fn) {
    this.#$reset.addEventListener('click', fn)
  }

  onCapabilitiesChanged (fn) {
    this.#$tool.addEventListener('change', fn)
    this.#$model.addEventListener('change', fn)
  }
}

export default new Controls()
