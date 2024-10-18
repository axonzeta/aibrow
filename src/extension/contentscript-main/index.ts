import AI from './AI'

const genericWindow = window as any
const browserAI = genericWindow.ai
const ai = new AI(browserAI)

if (process.env.BROWSER !== 'extlib') {
  if (!genericWindow.ai) {
    genericWindow.ai = ai
  }
  genericWindow.aibrow = ai
}

export default ai
