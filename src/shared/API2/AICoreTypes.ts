import { AIModelManifestConfigRange } from '../AIModelManifest'

/* **************************************************************************/
// MARK: Enums
/* **************************************************************************/

export enum AIModelGpuEngine {
  Metal = 'metal',
  Cuda = 'cuda',
  Vulkan = 'vulkan',
  Cpu = 'cpu',
  WebGpu = 'webgpu',
  Wasm = 'wasm'
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

export enum AIModelAvailability {
  Unavailable = "unavailable",
  Downloadable = "downloadable",
  Downloading = "downloading",
  Available = "available"
}

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export type AIModelCoreCompatibility = {
  score: number
  gpuEngines: AIModelGpuEngine[]
  flashAttention: boolean
  contextSize: AIModelManifestConfigRange
}

/* **************************************************************************/
// MARK: Class
/* **************************************************************************/

export abstract class AICoreModel {
  static compatibility: (options: AIModelCoreCreateOptions) => Promise<AIModelCoreCompatibility | null>

  destroy: () => void
}

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type AICreateMonitor = EventTarget & {
  ondownloadprogress: () => void
}

export type AICreateMonitorCallback = (monitor: AICreateMonitor) => void

export type AIModelCoreCreateOptions = {
  signal?: AbortSignal
  monitor?: AICreateMonitorCallback

  model?: string
  gpuEngine?: AIModelGpuEngine
  dtype?: AIModelDType
  flashAttention?: boolean
  contextSize?: number
}
