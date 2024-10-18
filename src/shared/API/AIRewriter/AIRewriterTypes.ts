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

export enum AIRewriterTone {
  AsIs = 'as-is',
  MoreFormal = 'more-formal',
  MoreCasual = 'more-casual'
}

export enum AIRewriterFormat {
  AsIs = 'as-is',
  PlainText = 'plain-text',
  Markdown = 'markdown'
}

export enum AIRewriterLength {
  AsIs = 'as-is',
  Shorter = 'shorter',
  Longer = 'longer'
}

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AIRewriterCapabilitiesOptions = AIRootCapabilitiesOptions

export type AIRewriterCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AIRewriterCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: Rewriter
/* **************************************************************************/

export type AIRewriterProps = {
  sharedContext?: string
  tone?: AIRewriterTone
  format?: AIRewriterFormat
  length?: AIRewriterLength
} & AIRootModelProps

export type AIRewriterCreateOptions = AIRootCreateOptions & Partial<AIRewriterProps>

export type AIRewriterData = {
  props: AIRewriterProps
} & AIRootModelData

export type AIRewriterRewriteOptions = {
  signal?: AbortSignal
  context?: string
}
