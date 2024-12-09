import AISummarizer from './AISummarizer'
import {
  AISummarizerCapabilitiesOptions,
  AISummarizerCreateOptions,
  AISummarizerCapabilitiesData,
  AISummarizerData
} from './AISummarizerTypes'
import AISummarizerCapabilities from './AISummarizerCapabilities'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kSummarizerCreate,
  kSummarizerGetCapabilities
} from './AISummarizerIPCTypes'
import { kModelCreationAborted } from '../../Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '../../IPC/IPCClient'

class AISummarizerFactory {
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

  capabilities = async (options: AISummarizerCapabilitiesOptions): Promise<AISummarizerCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kSummarizerGetCapabilities, options)
    ) as AISummarizerCapabilitiesData

    return new AISummarizerCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AISummarizerCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kSummarizerCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AISummarizerData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AISummarizer(this.#ipc, data, options.signal)
  }
}

export default AISummarizerFactory
