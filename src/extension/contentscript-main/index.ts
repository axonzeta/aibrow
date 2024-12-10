import AI from './AI'
import Translation from './Translation'

export const ai = new AI(window.ai)
export const translation = new Translation(ai, (window as any).translation)

const genericWindow = window as any
if (!window.ai || genericWindow.ai?.__aibrowOverride === true) {
  genericWindow.ai = ai
}
if (!genericWindow.translation || genericWindow.translation?.__aibrowOverride === true) {
  genericWindow.translation = translation
}
genericWindow.aibrow = ai
genericWindow.aibrowTranslation = translation

export default ai
