import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type TranslatorCreateOptions = AIModelCoreCreateOptions & {
  sourceLanguage: string
  targetLanguage: string
}

/* **************************************************************************/
// MARK: Writer
/* **************************************************************************/

export type TranslatorTranslateOptions = {
  signal?: AbortSignal
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type TranslatorState = AIModelCoreState & {
  sourceLanguage: string
  targetLanguage: string
  inputQuota: number
}
