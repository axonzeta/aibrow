import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import {
  AICoreModelData
} from '#Shared/API/AICoreModel/AICoreModelTypes'
import {
  kCoreModelGetCapabilities,
  kCoreModelCreate,
  kCoreModelDestroy,
  kCoreModelPrompt
} from '#Shared/API/AICoreModel/AICoreModelIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AIPrompter from '../AI/AIPrompter'
import { nanoid } from 'nanoid'
import { AICapabilityPromptType } from '#Shared/API/AI'

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
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.CoreModel)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.CoreModel, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          ...props,
          grammar: payload.getAny('grammar')
        }
      } as AICoreModelData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AIPrompter.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Prompting
  /* **************************************************************************/

  #handlePrompt = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, async (
      manifest,
      payload,
      options
    ) => {
      const prompt = payload.getString('prompt')
      const grammar = payload.getAny('props.grammar')

      await AIPrompter.prompt(
        {
          ...options,
          prompt,
          grammar
        },
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )

      return {}
    })
  }
}

export default AICoreModelHandler
