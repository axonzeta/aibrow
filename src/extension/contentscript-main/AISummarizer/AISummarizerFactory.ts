import AISummarizer from './AISummarizer'
import {
  AISummarizerCapabilitiesOptions,
  AISummarizerCreateOptions,
  AISummarizerCapabilitiesData,
  AISummarizerData
} from '#Shared/API/AISummarizer/AISummarizerTypes'
import AISummarizerCapabilities from './AISummarizerCapabilities'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kSummarizerCreate,
  kSummarizerGetCapabilities
} from '#Shared/API/AISummarizer/AISummarizerIPCTypes'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AISummarizerFactory {
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

  capabilities = async (options: AISummarizerCapabilitiesOptions): Promise<AISummarizerCapabilities> => {
    const data = throwIPCErrorResponse(
      await IPC.request(kSummarizerGetCapabilities, options)
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
      await IPC.stream(
        kSummarizerCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AISummarizerData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AISummarizer(data, options.signal)
  }
}

export default AISummarizerFactory
