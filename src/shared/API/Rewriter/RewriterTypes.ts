import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export enum RewriterTone {
  AsIs = 'as-is',
  MoreFormal = 'more-formal',
  MoreCasual = 'more-casual'
}

export enum RewriterFormat {
  AsIs = 'as-is',
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum RewriterLength {
  AsIs = 'as-is',
  Shorter = 'shorter',
  Longer = 'longer'
}

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type RewriterCreateOptions = AIModelCoreCreateOptions & {
  tone?: RewriterTone
  format?: RewriterFormat
  length?: RewriterLength
  expectedInputLanguages?: string[]
  expectedContextLanguages?: string[]
  outputLanguage?: string

  sharedContext?: string
}

/* **************************************************************************/
// MARK: Options
/* **************************************************************************/

export type RewriterWriteOptions = {
  signal?: AbortSignal
  context?: string
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type RewriterState = AIModelCoreState & {
  tone: RewriterTone
  format: RewriterFormat
  length: RewriterLength
  sharedContext: string
  expectedInputLanguages: string[]
  expectedContextLanguages: string[]
  outputLanguage: string
  inputQuota: number
}
