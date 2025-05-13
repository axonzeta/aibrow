import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export enum SummarizerType {
  Tldr = 'tl;dr',
  Teaser = 'teaser',
  KeyPoints = 'key-points',
  Headline = 'headline'
}

export enum SummarizerFormat {
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum SummarizerLength {
  Short = 'short',
  Medium = 'medium',
  Long = 'long'
}

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type SummarizerCreateOptions = AIModelCoreCreateOptions & {
  type?: SummarizerType
  format?: SummarizerFormat
  length?: SummarizerLength
  expectedInputLanguages?: string[]
  expectedContextLanguages?: string[]
  outputLanguage?: string

  sharedContext?: string
}

/* **************************************************************************/
// MARK: Summarizer
/* **************************************************************************/

export type SummarizerSummarizeOptions = {
  signal?: AbortSignal
  context?: string
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type SummarizerState = AIModelCoreState & {
  type: SummarizerType
  format: SummarizerFormat
  length: SummarizerLength
  sharedContext: string
  expectedInputLanguages: string[]
  expectedContextLanguages: string[]
  outputLanguage: string
  inputQuota: number
}
