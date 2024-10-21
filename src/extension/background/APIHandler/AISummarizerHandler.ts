import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import {
  AISummarizerType,
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerData
} from '#Shared/API/AISummarizer/AISummarizerTypes'
import {
  kSummarizerGetCapabilities,
  kSummarizerCreate,
  kSummarizerDestroy,
  kSummarizerSummarize
} from '#Shared/API/AISummarizer/AISummarizerIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AIPrompter from '../AI/AIPrompter'
import { nanoid } from 'nanoid'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { Template } from '@huggingface/jinja'
import { AICapabilityPromptType } from '#Shared/API/AI'
import { kModelPromptTypeNotSupported } from '#Shared/Errors'

class AISummarizerHandler {
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
      .addRequestHandler(kSummarizerGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kSummarizerCreate, this.#handleCreate)
      .addRequestHandler(kSummarizerDestroy, this.#handleDestroy)
      .addRequestHandler(kSummarizerSummarize, this.#handleSummarize)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AICapabilityPromptType.Summarizer)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AICapabilityPromptType.Summarizer, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          ...props,
          sharedContext: payload.getNonEmptyString('sharedContext'),
          type: payload.getEnum('type', AISummarizerType, AISummarizerType.Tldr),
          format: payload.getEnum('format', AISummarizerFormat, AISummarizerFormat.Markdown),
          length: payload.getEnum('length', AISummarizerLength, AISummarizerLength.Medium)
        }
      } as AISummarizerData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AIPrompter.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Summarizer
  /* **************************************************************************/

  #handleSummarize = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, async (
      manifest,
      payload,
      options
    ) => {
      const sharedContext = payload.getString('props.sharedContext')
      const type = payload.getEnum('props.type', AISummarizerType, AISummarizerType.Tldr)
      const format = payload.getEnum('props.format', AISummarizerFormat, AISummarizerFormat.Markdown)
      const length = payload.getEnum('props.length', AISummarizerLength, AISummarizerLength.Medium)
      const context = payload.getString('context')
      const input = payload.getString('input')
      const prompt = this.#getPrompt(manifest, type, format, length, sharedContext, context, input)

      await AIPrompter.prompt(
        { ...options, prompt },
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
    type: AISummarizerType,
    format: AISummarizerFormat,
    length: AISummarizerLength,
    sharedContext: string,
    context: string,
    input: string
  ) {
    if (!manifest.prompts[AICapabilityPromptType.Summarizer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AICapabilityPromptType.Summarizer]
    const template = new Template(config.template)
    return template.render({
      type,
      format,
      length,
      shared_context: sharedContext,
      context,
      input,
      bos_token: config.bosToken,
      eos_token: config.eosToken
    })
  }
}

export default AISummarizerHandler
