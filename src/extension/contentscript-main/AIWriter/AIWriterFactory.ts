import AIWriter from './AIWriter'
import {
  AIWriterCapabilitiesOptions,
  AIWriterCapabilitiesData,
  AIWriterCreateOptions,
  AIWriterData
} from '#Shared/API/AIWriter/AIWriterTypes'
import AIWriterCapabilities from './AIWriterCapabilities'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kWriterCreate,
  kWriterGetCapabilities
} from '#Shared/API/AIWriter/AIWriterIPCTypes'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AIWriterFactory {
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

  capabilities = async (options: AIWriterCapabilitiesOptions): Promise<AIWriterCapabilities> => {
    const data = throwIPCErrorResponse(
      await IPC.request(kWriterGetCapabilities, options)
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
      await IPC.stream(
        kWriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIWriterData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIWriter(data, options.signal)
  }
}

export default AIWriterFactory
