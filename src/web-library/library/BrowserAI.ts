const genericAI = window.ai as any
const ai = genericAI?.aibrow === true
  ? genericAI?.browserAI as AI
  : window.ai

export default ai
