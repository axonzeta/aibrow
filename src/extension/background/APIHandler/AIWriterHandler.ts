import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import {
  AIWriterTone,
  AIWriterFormat,
  AIWriterLength,
  AIWriterData
} from '#Shared/API/AIWriter/AIWriterTypes'
import {
  kWriterGetCapabilities,
  kWriterCreate,
  kWriterDestroy,
  kWriterWrite
} from '#Shared/API/AIWriter/AIWriterIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AILlmSession from '../AI/AILlmSession'
import { nanoid } from 'nanoid'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { Template } from '@huggingface/jinja'
import { AICapabilityPromptType } from '#Shared/API/AI'
import { kModelPromptTypeNotSupported } from '#Shared/Errors'

class AIWriterHandler {
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
      .addRequestHandler(kWriterGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kWriterCreate, this.#handleCreate)
      .addRequestHandler(kWriterDestroy, this.#handleDestroy)
      .addRequestHandler(kWriterWrite, this.#handleWrite)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.Writer)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.Writer, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          ...props,
          sharedContext: payload.getNonEmptyString('sharedContext'),
          tone: payload.getEnum('tone', AIWriterTone, AIWriterTone.Neutral),
          format: payload.getEnum('format', AIWriterFormat, AIWriterFormat.Markdown),
          length: payload.getEnum('length', AIWriterLength, AIWriterLength.Short)
        }
      } as AIWriterData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers
  /* **************************************************************************/

  #handleWrite = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, async (
      manifest,
      payload,
      props
    ) => {
      const sharedContext = payload.getString('props.sharedContext')
      const tone = payload.getEnum('props.tone', AIWriterTone, AIWriterTone.Neutral)
      const format = payload.getEnum('props.format', AIWriterFormat, AIWriterFormat.Markdown)
      const length = payload.getEnum('props.length', AIWriterLength, AIWriterLength.Short)
      const context = payload.getString('context')
      const input = payload.getString('input')
      const prompt = this.#getPrompt(manifest, tone, format, length, sharedContext, context, input)
      const sessionId = payload.getNonEmptyString('sessionId')

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

  #getPrompt (
    manifest: AIModelManifest,
    tone: AIWriterTone,
    format: AIWriterFormat,
    length: AIWriterLength,
    sharedContext: string,
    context: string,
    input: string
  ) {
    if (!manifest.prompts[AICapabilityPromptType.Writer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AICapabilityPromptType.Writer]
    const template = new Template(config.template)
    return template.render({
      tone,
      format,
      length,
      sharedContext,
      context,
      input,
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken
    })
  }
}

export default AIWriterHandler
