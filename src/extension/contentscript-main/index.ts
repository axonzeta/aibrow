import AI from './AI'

const ai = new AI(window.ai)

if (process.env.BROWSER !== 'extlib') {
  const genericWindow = window as any
  if (!window.ai) {
    genericWindow.ai = ai
  }
  genericWindow.aibrow = ai
}

export default ai
