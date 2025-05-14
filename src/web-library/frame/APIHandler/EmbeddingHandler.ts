import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kEmbeddingCompatibility,
  kEmbeddingAvailability,
  kEmbeddingCreate,
  kEmbeddingDestroy,
  kEmbeddingGet
} from '#Shared/API/Embedding/EmbeddingIPCTypes'
import {
  EmbeddingState,
  EmbeddingVector
} from '#Shared/API/Embedding/EmbeddingTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType,
  AIModelPromptProps
} from '#Shared/API/AICoreTypes'
import {
  getNonEmptyString
} from '#Shared/Typo/TypoParser'
import AILlmSession from '../AI/AILlmSession'
import TypoObject from '#Shared/Typo/TypoObject'
import { AIModelManifest } from '#Shared/AIModelManifest'

class EmbeddingHandler {
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
      .addRequestHandler(kEmbeddingAvailability, this.#handleGetAvailability)
      .addRequestHandler(kEmbeddingCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kEmbeddingCreate, this.#handleCreate)
      .addRequestHandler(kEmbeddingDestroy, this.#handleDestroy)
      .addRequestHandler(kEmbeddingGet, this.#handleGet)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #buildStateFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)
    } as EmbeddingState
  }

  #buildPromptPropsFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload.getTypo('state'))
    } as Partial<AIModelPromptProps>
  }

  /* **************************************************************************/
  // MARK: Handlers: Availability & compatibility
  /* **************************************************************************/

  #handleGetAvailability = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Embedding, AIModelPromptType.Embedding)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Embedding, AIModelPromptType.Embedding)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Embedding, AIModelPromptType.Embedding, async (
      manifest,
      sessionId,
      payload
    ): Promise<{ sessionId: string, state: EmbeddingState }> => {
      const state = await this.#buildStateFromPayload(manifest, payload)
      return { sessionId, state }
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Embeddings
  /* **************************************************************************/

  /**
   * Sends the session prompt to the native binary with the updated payload
   * @param channel: the IPC channel that is being processed
   * @returns the stream response
   */
  #handleGet = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const inputs = payload.getStringArray('inputs')

      const embedding = await AILlmSession.getEmbeddingVectors(
        sessionId,
        inputs,
        await this.#buildPromptPropsFromPayload(manifest, payload),
        { signal: channel.abortSignal }
      )

      return embedding as EmbeddingVector[]
    })
  }
}

export default EmbeddingHandler
