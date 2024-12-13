import { AIModelManifestConfigRange } from '../AIModelManifest'

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
  Cpu = 'cpu',
  WebGpu = 'webgpu',
  Wasm = 'wasm'
}

export enum AICapabilityPromptType {
  CoreModel = null,
  Embedding = null,
  LanguageModel = 'languageModel',
  Summarizer = 'summarizer',
  Writer = 'writer',
  Rewriter = 'rewriter',
  Translator = 'translator',
  LanguageDetector = 'languageDetector'
}

export enum AIModelType {
  Text = 'text',
  Embedding = 'embedding'
}

/* **************************************************************************/
// MARK: Core capabilities
/* **************************************************************************/

export enum AIHelperInstalledState {
  Responded = 'responded',
  RespondedOutdated = 'responded-outdated',
  Errored = 'errored',
  NotInstalled = 'not-installed'
}

export type AICapabilities = {
  extension: boolean
  helper: boolean
  helperState: AIHelperInstalledState
}

export type AIRootCapabilitiesOptions = {
  model?: string
}

export type AIRootModelCapabilitiesData = {
  available: AICapabilityAvailability
  gpuEngines: AICapabilityGpuEngine[]
  score: number
  supportedLanguages?: string[]
  topK?: AIModelManifestConfigRange
  temperature?: AIModelManifestConfigRange
  topP?: AIModelManifestConfigRange
  repeatPenalty?: AIModelManifestConfigRange
  flashAttention?: boolean
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
  contextSize: number
  grammar?: any
  useMmap: boolean
}

export type AIRootModelData = {
  sessionId: string
}
