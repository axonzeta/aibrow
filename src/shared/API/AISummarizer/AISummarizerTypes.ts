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

export enum AISummarizerType {
  Tldr = 'tl;dr',
  KeyPoints = 'key-points',
  Teaser = 'teaser',
  Headline = 'headline'
}

export enum AISummarizerFormat {
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum AISummarizerLength {
  Short = 'short',
  Medium = 'medium',
  Long = 'long'
}

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AISummarizerCapabilitiesOptions = AIRootCapabilitiesOptions

export type AISummarizerCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AISummarizerCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Summarizer
/* **************************************************************************/

type SummarizerProps = {
  sharedContext?: string
  type?: AISummarizerType
  format?: AISummarizerFormat
  length?: AISummarizerLength
}

export type AISummarizerProps = SummarizerProps & AIRootModelProps

export type AISummarizerCreateOptions = AIRootCreateOptions & Partial<SummarizerProps>

export type AISummarizerData = {
  props: AISummarizerProps
} & AIRootModelData

export type AISummarizerSummarizeOptions = {
  signal?: AbortSignal
  context?: string
}
