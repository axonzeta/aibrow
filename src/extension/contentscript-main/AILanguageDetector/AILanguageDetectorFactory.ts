import {
  AILanguageDetectorCapabilitiesOptions,
  AILanguageDetectorCreateOptions,
  AILanguageDetectorData,
  AILanguageDetectorCapabilitiesData
} from '#Shared/API/AILanguageDetector/AILanguageDetectorTypes'
import {
  kLanguageDetectorGetCapabilities,
  kLanguageDetectorCreate
} from '#Shared/API/AILanguageDetector/AILanguageDetectorIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AILanguageDetectorCapabilities from './AILanguageDetectorCapabilities'
import AILanguageDetector from './AILanguageDetector'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '#Shared/IPC/IPCClient'

class AILanguageDetectorFactory {
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

  capabilities = async (options: AILanguageDetectorCapabilitiesOptions = {}): Promise<AILanguageDetectorCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kLanguageDetectorGetCapabilities, options)
    ) as AILanguageDetectorCapabilitiesData

    return new AILanguageDetectorCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AILanguageDetectorCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kLanguageDetectorCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AILanguageDetectorData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AILanguageDetector(this.#ipc, data, options.signal)
  }
}

export default AILanguageDetectorFactory
