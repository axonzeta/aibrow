import AIWriter from './AIWriter'
import {
  AIWriterCapabilitiesOptions,
  AIWriterCapabilitiesData,
  AIWriterCreateOptions,
  AIWriterData
} from './AIWriterTypes'
import AIWriterCapabilities from './AIWriterCapabilities'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kWriterCreate,
  kWriterGetCapabilities
} from './AIWriterIPCTypes'
import { kModelCreationAborted } from '../../Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '../../IPC/IPCClient'

class AIWriterFactory {
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

  capabilities = async (options: AIWriterCapabilitiesOptions): Promise<AIWriterCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kWriterGetCapabilities, options)
    ) as AIWriterCapabilitiesData

    return new AIWriterCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AIWriterCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kWriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIWriterData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIWriter(this.#ipc, data, options.signal)
  }
}

export default AIWriterFactory
