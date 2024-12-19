import { getNonEmptyString } from '#Shared/Typo/TypoParser'
import {
  AIEmbeddingData
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import {
  kEmbeddingGetCapabilities,
  kEmbeddingCreate,
  kEmbeddingDestroy,
  kEmbeddingGet
} from '#Shared/API/AIEmbedding/AIEmbeddingIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AILlmSession from '../AI/AILlmSession'
import { AICapabilityPromptType, AIModelType } from '#Shared/API/AI'

class AIEmbeddingHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #server: IPCServer

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (server: IPCServer) {
    this.#server = server

    this.#server
      .addRequestHandler(kEmbeddingGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kEmbeddingCreate, this.#handleCreate)
      .addRequestHandler(kEmbeddingDestroy, this.#handleDestroy)
      .addRequestHandler(kEmbeddingGet, this.#handleGet)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Embedding, AICapabilityPromptType.Embedding)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Embedding, AICapabilityPromptType.Embedding, async (
      manifest,
      sessionId,
      payload,
      props
    ) => {
      return {
        sessionId,
        props
      } as AIEmbeddingData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Prompting
  /* **************************************************************************/

  #handleGet = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Embedding, async (
      manifest,
      payload,
      props
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const inputs = payload.getStringArray('inputs')

      const embedding = await AILlmSession.getEmbeddingVectors(
        sessionId,
        inputs,
        props,
        { signal: channel.abortSignal }
      )

      return embedding
    })
  }
}

export default AIEmbeddingHandler