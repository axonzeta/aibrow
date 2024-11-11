import {
  AIRootCapabilitiesOptions,
  AIRootCloneOptions,
  AIRootCreateOptions,
  AIRootModelCapabilitiesData,
  AIRootModelProps,
  AIRootModelData
} from '../AI'

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export type AIEmbeddingVector = number[]

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AIEmbeddingCapabilitiesOptions = AIRootCapabilitiesOptions

export type AIEmbeddingCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AIEmbeddingCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Core model
/* **************************************************************************/

export type AIEmbeddingProps = AIRootModelProps

export type AIEmbeddingCreateOptions = AIRootCreateOptions & Partial<AIEmbeddingProps>

export type AIEmbeddingData = {
  props: AIEmbeddingProps
} & AIRootModelData

/* **************************************************************************/
// MARK: Getting
/* **************************************************************************/

export type AIEmbeddingGetOptions = {
  signal?: AbortSignal
}
