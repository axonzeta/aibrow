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
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.CoreModel, (manifest) => manifest.config)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.CoreModel, async (
      manifest,
      payload,
      { modelId, gpuEngine }
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          model: modelId,
          gpuEngine,
          topK: payload.getNumber('topK', manifest.config.defaultTopK),
          temperature: payload.getNumber('temperature', manifest.config.defaultTemperature),
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
      { sessionId, modelId, gpuEngine }
    ) => {
      const topK = payload.getNumber('props.topK', manifest.config.defaultTopK)
      const temperature = payload.getNumber('props.temperature', manifest.config.defaultTemperature)
      const prompt = payload.getString('prompt')

      await AIPrompter.prompt(
        {
          sessionId,
          modelId,
          gpuEngine,
          prompt,
          topK,
          temperature
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
