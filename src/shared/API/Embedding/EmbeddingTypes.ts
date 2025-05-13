import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export type EmbeddingVector = number[]

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type EmbeddingCreateOptions = AIModelCoreCreateOptions

/* **************************************************************************/
// MARK: Embeddings
/* **************************************************************************/

export type EmbeddingGetOptions = {
  signal?: AbortSignal
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type EmbeddingState = AIModelCoreState
