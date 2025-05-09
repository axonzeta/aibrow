import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Messages
/* **************************************************************************/

export type LanguageModelMessageContentValue = ImageBitmapSource | AudioBuffer | BufferSource | string

export enum LanguageModelMessageType {
  Text = 'text',
  Image = 'image',
  Audio = 'audio'
}

export enum LanguageModelMessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant'
}

export type LanguageModelMessageContent = {
  type: LanguageModelMessageType
  content: LanguageModelMessageContentValue
}

export type LanguageModelMessage = {
  role: LanguageModelMessageRole
  content: LanguageModelMessageContent[]
}

export type LanguageModelMessageShorthand = {
  role: LanguageModelMessageRole
  content: string
}

export type LanguageModelPrompt = LanguageModelMessage[] | LanguageModelMessageShorthand[] | string

export type LanguageModelInitialPrompts = LanguageModelMessage[] | LanguageModelMessageShorthand[]

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type LanguageModelExpectedInput = {
  type: LanguageModelMessageType
  languages?: string[];
}

export type LanguageModelCreateOptions = AIModelCoreCreateOptions & {
  initialPrompts?: LanguageModelInitialPrompts
  topK?: number
  temperature?: number
  expectedInputs?: LanguageModelExpectedInput[]
}

export type LanguageModelCloneOptions = {
  signal?: AbortSignal
}

/* **************************************************************************/
// MARK: Params
/* **************************************************************************/

export type LanguageModelParams = {
  defaultTopK: number
  maxTopK: number
  defaultTemperature: number
  maxTemperature: number
}

/* **************************************************************************/
// MARK: Prompting
/* **************************************************************************/

export type LanguageModelPromptDict = {
  role: LanguageModelMessageRole
  type: LanguageModelMessageType
  content: LanguageModelMessageContent
}

export type LanguageModelPromptOptions = {
  responseConstraint?: object | RegExp
  signal?: AbortSignal
}

export type LanguageModelAppendOptions = {
  signal?: AbortSignal
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type LanguageModelState = AIModelCoreState & {
  topK: number
  temperature: number
  inputUsage: number
  inputQuota: number
  messages: LanguageModelMessage[]
}
