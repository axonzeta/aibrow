import {
  AICoreModelCapabilitiesOptions,
  AICoreModelCreateOptions,
  AICoreModelData,
  AICoreModelCapabilitiesData
} from '#Shared/API/AICoreModel/AICoreModelTypes'
import {
  kCoreModelGetCapabilities,
  kCoreModelCreate
} from '#Shared/API/AICoreModel/AICoreModelIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AICoreModelCapabilities from './AICoreModelCapabilities'
import AICoreModel from './AICoreModel'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '#Shared/IPC/IPCClient'

class AICoreModelFactory {
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

  capabilities = async (options: AICoreModelCapabilitiesOptions = {}): Promise<AICoreModelCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kCoreModelGetCapabilities, options)
    ) as AICoreModelCapabilitiesData

    return new AICoreModelCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AICoreModelCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kCoreModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AICoreModelData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AICoreModel(this.#ipc, data, options.signal)
  }
}

export default AICoreModelFactory
