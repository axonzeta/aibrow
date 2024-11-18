import AI from './AI'
import Translation from './Translation'

export const ai = new AI(window.ai)
export const translation = new Translation(ai, (window as any).translation)

if (process.env.BROWSER !== 'extlib') {
  const genericWindow = window as any
  if (!window.ai) {
    genericWindow.ai = ai
  }
  if (!genericWindow.translation) {
    genericWindow.translation = translation
  }
  genericWindow.aibrow = ai
  genericWindow.aibrowTranslation = translation
}

export default ai
