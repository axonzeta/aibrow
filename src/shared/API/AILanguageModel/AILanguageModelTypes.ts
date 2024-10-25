import {
  AIRootCapabilitiesOptions,
  AIRootModelCapabilitiesData,
  AIRootCloneOptions,
  AIRootCreateOptions,
  AIRootModelProps,
  AIRootModelData
} from '../AI'

/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

export enum AILanguageModelInitialPromptRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant'
}

export enum AILanguageModelPromptRole {
  User = 'user',
  Assistant = 'assistant'
}

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AILanguageModelCapabilitiesOptions = AIRootCapabilitiesOptions

export type AILanguageModelCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AILanguageModelCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Language model
/* **************************************************************************/

export type AILanguageModelInitialPrompt = {
  role: AILanguageModelInitialPromptRole
  content: string
}

export type AILanguageModelPrompt = {
  role: AILanguageModelPromptRole
  content: string
}

type LanguageModelProps = {
  systemPrompt: string
  initialPrompts: AILanguageModelInitialPrompt[]
  grammar: any
}

export type AILanguageModelProps = {
  maxTokens: number
} & LanguageModelProps & AIRootModelProps

export type AILanguageModelCreateOptions = AIRootCreateOptions & Partial<LanguageModelProps>

export type AILanguageModelState = {
  tokensSoFar: number
  messages: AILanguageModelPrompt[]
}

export type AILanguageModelData = {
  props: AILanguageModelProps
  state: AILanguageModelState
} & AIRootModelData

/* **************************************************************************/
// MARK: Prompting
/* **************************************************************************/

export type AILanguageModelPromptOptions = {
  signal?: AbortSignal
}

export type AILanguageModelPromptInput = string | AILanguageModelPrompt | AILanguageModelPrompt[]
