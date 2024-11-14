import {
  AILanguageModelInitialPrompt,
  AILanguageModelInitialPromptRole,
  AILanguageModelPrompt,
  AILanguageModelPromptRole
} from '../AILanguageModel/AILanguageModelTypes'

/* **************************************************************************/
// MARK: Base types
/* **************************************************************************/

export function getString (val: any, defaultVal?: string | undefined): string | undefined {
  return typeof val === 'string' ? val : defaultVal
}

export function getNonEmptyString (val: any, defaultVal?: string | undefined): string | undefined {
  return typeof val === 'string' && val.length > 0 ? val : defaultVal
}

export function getNumber (val: any, defaultVal?: number | undefined): number | undefined {
  return typeof val === 'number' ? val : defaultVal
}

export function getEnum (val: any, enumType: any, defaultVal?: any): any {
  return Object.values(enumType).includes(val) ? val : defaultVal
}

export function getBool (val: any, defaultVal: boolean): boolean {
  return typeof val === 'boolean' ? val : defaultVal
}

export function getAny (val: any, defaultVal?: any): any {
  return val ?? defaultVal
}

export function clamp (val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

export function getRange (val: any, range: [number, number, number]) {
  const [min, defaultVal, max] = range
  return clamp(getNumber(val, defaultVal), min, max)
}

/* **************************************************************************/
// MARK: AI Language model
/* **************************************************************************/

export function getAILanguageModelInitialPrompts (prompts: any): AILanguageModelInitialPrompt[] {
  if (Array.isArray(prompts)) {
    return prompts.reduce((acc, prompt) => {
      const content = getNonEmptyString(prompt?.content)
      const role = getEnum(prompt?.role, AILanguageModelInitialPromptRole)
      if (content && role) {
        acc.push({ content, role })
      }
      return acc
    }, [])
  }

  return []
}

export function getAILanguageModelPrompts (prompts: any): AILanguageModelPrompt[] {
  if (Array.isArray(prompts)) {
    return prompts.reduce((acc, prompt) => {
      const content = getNonEmptyString(prompt?.content)
      const role = getEnum(prompt?.role, AILanguageModelPromptRole)
      if (content && role) {
        acc.push({ content, role })
      }
      return acc
    }, [])
  }

  return []
}
