import {
  AITranslatorCapabilitiesOptions,
  AITranslatorCreateOptions,
  AITranslatorData,
  AITranslatorCapabilitiesData
} from '#Shared/API/AITranslator/AITranslatorTypes'
import {
  kTranslatorGetCapabilities,
  kTranslatorCreate
} from '#Shared/API/AITranslator/AITranslatorIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AITranslatorCapabilities from './AITranslatorCapabilities'
import AITranslator from './AITranslator'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '#Shared/IPC/IPCClient'

class AITranslatorFactory {
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

  capabilities = async (options: AITranslatorCapabilitiesOptions = {}): Promise<AITranslatorCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kTranslatorGetCapabilities, options)
    ) as AITranslatorCapabilitiesData

    return new AITranslatorCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AITranslatorCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kTranslatorCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AITranslatorData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AITranslator(this.#ipc, data, options.signal)
  }
}

export default AITranslatorFactory
