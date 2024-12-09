import {
  AIEmbeddingCapabilitiesOptions,
  AIEmbeddingCreateOptions,
  AIEmbeddingData,
  AIEmbeddingCapabilitiesData
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import {
  kEmbeddingGetCapabilities,
  kEmbeddingCreate
} from '#Shared/API/AIEmbedding/AIEmbeddingIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AIEmbeddingCapabilities from './AIEmbeddingCapabilities'
import AIEmbedding from './AIEmbedding'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import { calculateCosineSimilarity, findSimilar } from './AIEmbeddingUtil'
import IPCClient from '#Shared/IPC/IPCClient'

class AIEmbeddingFactory {
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

  capabilities = async (options: AIEmbeddingCapabilitiesOptions = {}): Promise<AIEmbeddingCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kEmbeddingGetCapabilities, options)
    ) as AIEmbeddingCapabilitiesData

    return new AIEmbeddingCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AIEmbeddingCreateOptions = {}) => {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await this.#ipc.stream(
        kEmbeddingCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIEmbeddingData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIEmbedding(this.#ipc, data, options.signal)
  }

  /* **************************************************************************/
  // MARK: Comparison utils
  /* **************************************************************************/

  calculateCosineSimilarity = calculateCosineSimilarity

  findSimilar = findSimilar
}

export default AIEmbeddingFactory
