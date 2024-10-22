/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

import { AIModelManifestConfigRange } from '#Shared/AIModelManifest'

export enum AICapabilityAvailability {
  Readily = 'readily',
  AfterDownload = 'after-download',
  No = 'no'
}

export enum AICapabilityGpuEngine {
  Metal = 'metal',
  Cuda = 'cuda',
  Vulkan = 'vulkan',
  Cpu = 'cpu'
}

export enum AICapabilityPromptType {
  CoreModel = null,
  LanguageModel = 'languageModel',
  Summarizer = 'summarizer',
  Writer = 'writer',
  Rewriter = 'rewriter'
}

/* **************************************************************************/
// MARK: Core capabilities
/* **************************************************************************/

export type AICapabilities = {
  helper: boolean
}

export type AIRootCapabilitiesOptions = {
  model?: string
}

export type AIRootModelCapabilitiesData = {
  available: AICapabilityAvailability
  gpuEngines: AICapabilityGpuEngine[]
  supportedLanguages?: string[]
  topK?: AIModelManifestConfigRange
  temperature?: AIModelManifestConfigRange
  topP?: AIModelManifestConfigRange
  repeatPenalty?: AIModelManifestConfigRange
  flashAttention?: boolean
  useMmap?: boolean
  contextSize?: AIModelManifestConfigRange
}

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AIRootCloneOptions = {
  signal?: AbortSignal
}

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type AIRootCreateOptions = {
  model?: string
  gpuEngine?: AICapabilityGpuEngine
  topK?: number
  topP?: number
  temperature?: number
  repeatPenalty?: number
  flashAttention?: boolean
  useMmap?: boolean
  contextSize?: number
  signal?: AbortSignal
  monitor?: (m: EventTarget) => void
}

export type AIRootModelProps = {
  model: string
  gpuEngine: AICapabilityGpuEngine
  topK: number
  topP: number
  temperature: number
  repeatPenalty: number
  flashAttention: boolean
  useMmap: boolean
  contextSize: number
}

export type AIRootModelData = {
  sessionId: string
}
