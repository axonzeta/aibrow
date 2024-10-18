import AI from './AI'

const genericWindow = window as any
const browserAI = genericWindow.ai
const ai = new AI(browserAI)

if (process.env.BROWSER !== 'extlib') {
  genericWindow.ai = ai
}

export default ai
