/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

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

export type AIRootCapabilitiesOptions = {
  model?: string
}

export type AIRootModelCapabilitiesData = {
  available: AICapabilityAvailability
  gpuEngines: AICapabilityGpuEngine[]
  supportedLanguages?: string[]
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
  signal?: AbortSignal
  monitor?: (m: EventTarget) => void
}

export type AIRootModelProps = {
  model: string
  gpuEngine: AICapabilityGpuEngine
}

export type AIRootModelData = {
  sessionId: string
}
