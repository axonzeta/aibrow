import {
  AIRootCapabilitiesOptions,
  AIRootModelCapabilitiesData,
  AIRootCreateOptions,
  AIRootModelProps,
  AIRootModelData,
  AIRootCloneOptions
} from '../AI'

/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

export enum AIWriterTone {
  Formal = 'formal',
  Neutral = 'neutral',
  Casual = 'casual'
}

export enum AIWriterFormat {
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum AIWriterLength {
  Short = 'short',
  Medium = 'medium',
  Long = 'long'
}

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AIWriterCapabilitiesOptions = AIRootCapabilitiesOptions

export type AIWriterCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AIWriterCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Writer
/* **************************************************************************/

export type AIWriterProps = {
  sharedContext?: string
  tone?: AIWriterTone
  format?: AIWriterFormat
  length?: AIWriterLength
} & AIRootModelProps

export type AIWriterCreateOptions = AIRootCreateOptions & Partial<AIWriterProps>

export type AIWriterData = {
  props: AIWriterProps
} & AIRootModelData

export type AIWriterWriteOptions = {
  signal?: AbortSignal
  context?: string
}
