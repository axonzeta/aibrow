import {
  AILanguageModelCapabilitiesOptions,
  AILanguageModelCreateOptions,
  AILanguageModelData,
  AILanguageModelCapabilitiesData
} from './AILanguageModelTypes'
import {
  kLanguageModelGetCapabilities,
  kLanguageModelCreate
} from './AILanguageModelIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import AILanguageModelCapabilities from './AILanguageModelCapabilities'
import AILanguageModel from './AILanguageModel'
import { kModelCreationAborted } from '../../Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '../../IPC/IPCClient'

class AILanguageModelFactory {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient) {
    this.#ipc = ipc
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AILanguageModelCapabilitiesOptions = {}): Promise<AILanguageModelCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kLanguageModelGetCapabilities, options)
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
      await this.#ipc.stream(
        kLanguageModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AILanguageModelData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AILanguageModel(this.#ipc, data, options.signal)
  }
}

export default AILanguageModelFactory
