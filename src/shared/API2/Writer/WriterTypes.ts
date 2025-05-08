import {
  AIModelCoreCreateOptions
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export enum WriterTone {
  Formal = "formal",
  Neutral = "neutral",
  Casual = "casual"
}

export enum WriterFormat {
  PlainText = "plain-text",
  Markdown = "markdown"
}

export enum WriterLength {
  Short = "short",
  Medium = "medium",
  Long = "long"
}

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type WriterCreateOptions = AIModelCoreCreateOptions & {
  tone?: WriterTone
  format?: WriterFormat
  length?: WriterLength
  expectedInputLanguages?: string[]
  expectedContextLanguages?: string[]
  outputLanguage?: string

  sharedContext?: string
}

/* **************************************************************************/
// MARK: Writer
/* **************************************************************************/

export type WriterWriteOptions = {
  signal?: AbortSignal
  context?: string
}
