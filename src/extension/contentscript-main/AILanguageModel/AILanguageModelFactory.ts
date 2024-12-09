import {
  AILanguageModelCapabilitiesOptions,
  AILanguageModelCreateOptions,
  AILanguageModelData,
  AILanguageModelCapabilitiesData
} from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import {
  kLanguageModelGetCapabilities,
  kLanguageModelCreate
} from '#Shared/API/AILanguageModel/AILanguageModelIPCTypes'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AILanguageModelCapabilities from './AILanguageModelCapabilities'
import AILanguageModel from './AILanguageModel'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AILanguageModelFactory {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #browserAI: any

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (browserAI: any) {
    this.#browserAI = browserAI
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AILanguageModelCapabilitiesOptions = {}): Promise<AILanguageModelCapabilities> => {
    const data = throwIPCErrorResponse(
      await IPC.request(kLanguageModelGetCapabilities, options)
    ) as AILanguageModelCapabilitiesData

    return new AILanguageModelCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AILanguageModelCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await IPC.stream(
        kLanguageModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AILanguageModelData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AILanguageModel(data, options.signal)
  }
}

export default AILanguageModelFactory
