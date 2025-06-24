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
  prefix?: boolean
}

export type LanguageModelMessageShorthand = {
  role: LanguageModelMessageRole
  content: string
  prefix?: boolean
}

export type LanguageModelPrompt = LanguageModelMessage[] | LanguageModelMessageShorthand[] | string

export type LanguageModelInitialPrompts = LanguageModelMessage[] | LanguageModelMessageShorthand[]

/**
 * Converts a LanguageModelPrompt to an array of LanguageModelMessage. Removes any items with prefix set to true.
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
    return input.reduce((acc, item: LanguageModelMessage | LanguageModelMessageShorthand) => {
      if (item.prefix === true) {
        return acc // Skip prefix items
      }
      if (typeof (item.content) === 'string') {
        acc.push({
          content: [{ type: LanguageModelMessageType.Text, content: item.content }],
          role: item.role
        })
      } else if (Array.isArray(item.content)) {
        acc.push({
          content: item.content.map((contentItem) => {
            if (typeof contentItem === 'string') {
              return { type: LanguageModelMessageType.Text, content: contentItem }
            } else {
              return contentItem
            }
          }),
          role: item.role
        })
      } else {
        throw new Error('Malformed input')
      }

      return acc
    }, [] as LanguageModelMessage[])
  }

  throw new Error('Malformed input')
}

/**
 * Extracts the languageModel prefix from the prompt. The prefix item must be the last item in
 * the array, have prefix set to true, and have a role of LanguageModelMessageRole.Assistant.
 * @param input: the input to convert
 * @returns: the the prefix or undefined
 */
export function languageModelPromptAssistantPrefix (input: LanguageModelPrompt): string | undefined {
  if (Array.isArray(input)) {
    const last = input.at(-1)
    if (last && last.prefix === true && last.role === LanguageModelMessageRole.Assistant) {
      if (typeof last.content === 'string') {
        return last.content
      } else if (Array.isArray(last.content)) {
        throw new Error('Malformed input')
      }
    }
  }
  return undefined
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
