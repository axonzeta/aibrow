import AI from './AI'
import Translation from './Translation'

const ai = new AI(window.ai)

if (process.env.BROWSER !== 'extlib') {
  const genericWindow = window as any
  if (!window.ai) {
    genericWindow.ai = ai
  }
  if (!genericWindow.translation) {
    genericWindow.translation = new Translation(ai)
  }
  genericWindow.aibrow = ai
}

export default ai
