import { AIModelManifestConfigRange } from '../AIModelManifest'

//TODO: remove API import

/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

export enum AICapabilityAvailability {
  Readily = 'readily',
  AfterDownload = 'after-download',
  No = 'no'
}

export enum AIModelGpuEngine {
  Metal = 'metal',
  Cuda = 'cuda',
  Vulkan = 'vulkan',
  Cpu = 'cpu',
  WebGpu = 'webgpu',
  Wasm = 'wasm'
}

export enum AIModelPromptType {
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

export enum AIModelDType {
  Auto = 'auto',
  Fp32 = 'fp32',
  Fp16 = 'fp16',
  Q8 = 'q8',
  Int8 = 'int8',
  Uint8 = 'uint8',
  Q4 = 'q4',
  Bnb4 = 'bnb4',
  Q4f16 = 'q4f16'
}

/* **************************************************************************/
// MARK: Core capabilities
/* **************************************************************************/

export type AICapabilities = {
  ready: boolean
}

export type AIRootCapabilitiesOptions = {
  model?: string
}

export type AIRootModelCapabilitiesData = {
  available: AICapabilityAvailability
  gpuEngines: AIModelGpuEngine[]
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
// MARK: Core capabilities: Extension
/* **************************************************************************/

export enum AIExtensionHelperInstalledState {
  Responded = 'responded',
  RespondedOutdated = 'responded-outdated',
  Errored = 'errored',
  NotInstalled = 'not-installed'
}

export type AIExtensionCapabilities = {
  extension: boolean
  helper: boolean
  helperState: AIExtensionHelperInstalledState
} & AICapabilities

/* **************************************************************************/
// MARK: Core capabilities: Web
/* **************************************************************************/

export type AIWebCapabilities = {
  gpu: boolean
  cpu: boolean
} & AICapabilities

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
  gpuEngine?: AIModelGpuEngine
  dtype?: AIModelDType
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
  gpuEngine: AIModelGpuEngine
  dtype: AIModelDType
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
