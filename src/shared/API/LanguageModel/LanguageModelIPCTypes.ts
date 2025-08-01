export const kLanguageModelCompatibility = '2:AI:LanguageModel:Compatibility'
export const kLanguageModelAvailability = '2:AI:LanguageModel:Availability'
export const kLanguageModelParams = '2:AI:LanguageModel:Params'

export const kLanguageModelCreate = '2:AI:LanguageModel:Create'
export const kLanguageModelDestroy = '2:AI:LanguageModel:Destroy'
export const kLanguageModelPrompt = '2:AI:LanguageModel:Prompt'
export const kLanguageModelChat = '2:AI:LanguageModel:Chat'
export const kLanguageModelMeasureInput = '2:AI:LanguageModel:MeasureInput'
export const kLanguageModelToolCall = '2:AI:LanguageModel:ToolCall'
export const kLanguageModelToolResult = '2:AI:LanguageModel:ToolResult'

export enum LanguageModelStreamChunkType {
  Reply = 'reply',
  ToolCall = 'toolCall'
}