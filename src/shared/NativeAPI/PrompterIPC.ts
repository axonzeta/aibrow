import { AICapabilityGpuEngine } from '../API/AI'

export const kPrompterGetSupportedGpuEngines = 'Prompter:GetSupportedGpuEngines'
export const kPrompterDisposePromptSession = 'Prompter:DisposePromptSession'
export const kPrompterExecPromptSession = 'Prompter:ExecPromptSession'

export type PromptOptions = {
  sessionId: string
  modelId: string
  gpuEngine?: AICapabilityGpuEngine
  prompt: string
  topK?: number
  temperature?: number
  grammar?: any
}
