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

/**
 * Converts a LanguageModelPrompt to an array of LanguageModelMessage
 * @param input: the input to convert
 * @returns: the full languageModel message
 */
export function languageModelPromptToMessages (input: LanguageModelPrompt): LanguageModelMessage[] {
  if (typeof input === 'string') {
    return [{
      content: [{ type: LanguageModelMessageType.Text, content: input }],
      role: LanguageModelMessageRole.User
    }]
  } else if (Array.isArray(input)) {
    return input.map((item: LanguageModelMessage | LanguageModelMessageShorthand) => {
      if (typeof (item.content) === 'string') {
        return {
          content: [{ type: LanguageModelMessageType.Text, content: item.content }],
          role: item.role
        }
      } else if (Array.isArray(item.content)) {
        return {
          content: item.content.map((contentItem) => {
            if (typeof contentItem === 'string') {
              return { type: LanguageModelMessageType.Text, content: contentItem }
            } else {
              return contentItem
            }
          }),
          role: item.role
        }
      }

      throw new Error('Malformed input')
    })
  }

  throw new Error('Malformed input')
}

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
  topP?: number
  repeatPenalty?: number
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
  defaultTopP: number
  maxTopP: number
  defaultRepeatPenalty: number
  maxRepeatPenalty: number
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
  topP: number
  repeatPenalty: number
  temperature: number
  inputUsage: number
  inputQuota: number
  messages: LanguageModelMessage[]
}
