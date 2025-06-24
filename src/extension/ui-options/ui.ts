type TemplateOptions = {
  text?: Record<string, string>
  click?: Record<string, (evt: MouseEvent) => void>,
  into?: HTMLElement | string,
  render?: Record<string, () => HTMLElement | HTMLElement[]>
}

/* **************************************************************************/
// MARK: Rendering
/* **************************************************************************/

/**
 * Renders a template
 * @param template: the template to clone and render into
 * @param options: the rendering options
 * @returns the cloned element
 */
export function render (templateOrSelector: HTMLTemplateElement | string, options: TemplateOptions) {
  const template = getElement(templateOrSelector) as HTMLTemplateElement
  const $root = template.content.cloneNode(true) as HTMLElement

  if (options.text) {
    for (const [key, value] of Object.entries(options.text)) {
      $root.querySelectorAll(`[data-text="${key}"]`).forEach(($el) => { $el.textContent = value })
    }
  }

  if (options.click) {
    for (const [key, value] of Object.entries(options.click)) {
      $root.querySelectorAll(`[data-click="${key}"]`).forEach(($el) => $el.addEventListener('click', value))
    }
  }

  if (options.render) {
    for (const [key, render] of Object.entries(options.render)) {
      const $target = $root.querySelector(`[data-render="${key}"]`)
      const $children = render()
      for (const $child of Array.isArray($children) ? $children : [$children]) {
        $target.appendChild($child)
      }
    }
  }

  if (options.into) {
    getElement(options.into).appendChild($root)
  }

  return $root
}

/* **************************************************************************/
// MARK: Elements
/* **************************************************************************/

/**
 * Gets an element either from the given element or by selecting it from the dom
 * @param $el: the element or selector
 * @returns the element
 */
export function getElement ($el: HTMLElement | string) {
  return typeof $el === 'string'
    ? document.querySelector($el) as HTMLElement
    : $el
}

/**
 * Empties an element
 * @param $el: the element to empty
 */
export function empty ($el: HTMLElement | string) {
  getElement($el).innerHTML = ''
}
