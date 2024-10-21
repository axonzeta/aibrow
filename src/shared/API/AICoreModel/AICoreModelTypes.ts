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

export type AICoreModelCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AICoreModelCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Core model
/* **************************************************************************/

type CoreModelProps = {
  grammar: any
}

export type AICoreModelProps = CoreModelProps & AIRootModelProps

export type AICoreModelCreateOptions = AIRootCreateOptions & Partial<CoreModelProps>

export type AICoreModelData = {
  props: AICoreModelProps
} & AIRootModelData

/* **************************************************************************/
// MARK: Prompting
/* **************************************************************************/

export type AICoreModelPromptOptions = {
  signal?: AbortSignal
}
