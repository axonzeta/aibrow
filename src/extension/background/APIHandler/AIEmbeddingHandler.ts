import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import {
  AIEmbeddingData,
  AIEmbeddingVector
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
import { nanoid } from 'nanoid'
import { AICapabilityPromptType } from '#Shared/API/AI'

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
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.Embedding)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.Embedding, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props
      } as AIEmbeddingData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Prompting
  /* **************************************************************************/

  #handleGet = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, async (
      manifest,
      payload,
      props
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const input = payload.getString('input')

      const embedding = await AILlmSession.getEmbeddingVector(
        sessionId,
        input,
        props,
        { signal: channel.abortSignal }
      )

      return embedding as AIEmbeddingVector
    })
  }
}

export default AIEmbeddingHandler
