import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import {
  AICoreModelData
} from '#Shared/API/AICoreModel/AICoreModelTypes'
import {
  kCoreModelGetCapabilities,
  kCoreModelCreate,
  kCoreModelDestroy,
  kCoreModelPrompt,
  kCoreModelCountTokens
} from '#Shared/API/AICoreModel/AICoreModelIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AILlmSession from '../AI/AILlmSession'
import { nanoid } from 'nanoid'
import { AICapabilityPromptType, AIModelType } from '#Shared/API/AI'
import { kModelPromptAborted } from '#Shared/Errors'

class AICoreModelHandler {
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
      .addRequestHandler(kCoreModelGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kCoreModelCreate, this.#handleCreate)
      .addRequestHandler(kCoreModelDestroy, this.#handleDestroy)
      .addRequestHandler(kCoreModelPrompt, this.#handlePrompt)
      .addRequestHandler(kCoreModelCountTokens, this.#handleCountTokens)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AICapabilityPromptType.CoreModel)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AICapabilityPromptType.CoreModel, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props
      } as AICoreModelData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Prompting
  /* **************************************************************************/

  #handlePrompt = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const prompt = payload.getString('prompt')

      await AILlmSession.prompt(
        sessionId,
        prompt,
        props,
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )

      return {}
    })
  }

  /* **************************************************************************/
  // MARK: Tokens
  /* **************************************************************************/

  #handleCountTokens = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const input = payload.getString('input')
      if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

      const count = (await AILlmSession.countTokens(
        input,
        props,
        { signal: channel.abortSignal }
      )) as number

      return count
    })
  }
}

export default AICoreModelHandler
