import {
  AIRootCapabilitiesOptions,
  AIRootCloneOptions,
  AIRootCreateOptions,
  AIRootModelCapabilitiesData,
  AIRootModelProps,
  AIRootModelData
} from '../AI'

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AICoreModelCapabilitiesOptions = AIRootCapabilitiesOptions

export type AICoreModelCapabilitiesData = {
  defaultTopK?: number
  maxTopK?: number
  defaultTemperature?: number
  maxTemperature?: number
} & AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AICoreModelCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Core model
/* **************************************************************************/

export type AICoreModelProps = {
  grammar: any
  topK: number
  temperature: number
} & AIRootModelProps

export type AICoreModelCreateOptions = AIRootCreateOptions & Partial<AICoreModelProps>

export type AICoreModelData = {
  props: AICoreModelProps
} & AIRootModelData

/* **************************************************************************/
// MARK: Prompting
/* **************************************************************************/

export type AICoreModelPromptOptions = {
  signal?: AbortSignal
}
