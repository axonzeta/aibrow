import {
  AIRootCapabilitiesOptions,
  AIRootModelCapabilitiesData,
  AIRootCreateOptions,
  AIRootModelProps,
  AIRootModelData,
  AIRootCloneOptions
} from '../AI'

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AITranslatorCapabilitiesOptions = AIRootCapabilitiesOptions

export type AITranslatorCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AITranslatorCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Translator
/* **************************************************************************/

type TranslatorProps = {
  sourceLanguage: string
  targetLanguage: string
}

export type AITranslatorProps = TranslatorProps & AIRootModelProps

export type AITranslatorCreateOptions = AIRootCreateOptions & Partial<TranslatorProps>

export type AITranslatorData = {
  props: AITranslatorProps
} & AIRootModelData

export type AITranslatorTranslateOptions = {
  signal?: AbortSignal
}
