import { getNonEmptyString } from '#Shared/Typo/TypoParser'
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
import AILlmSession from '../AI/AILlmSession'
import { nanoid } from 'nanoid'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { Template } from '@huggingface/jinja'
import { AIModelPromptType, AIModelType } from '#Shared/API/AI'
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
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AIModelPromptType.Summarizer)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Summarizer, async (
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
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Summarizer
  /* **************************************************************************/

  #handleSummarize = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const sharedContext = payload.getString('props.sharedContext')
      const type = payload.getEnum('props.type', AISummarizerType, AISummarizerType.Tldr)
      const format = payload.getEnum('props.format', AISummarizerFormat, AISummarizerFormat.Markdown)
      const length = payload.getEnum('props.length', AISummarizerLength, AISummarizerLength.Medium)
      const context = payload.getString('context')
      const input = payload.getString('input')
      const prompt = this.#getPrompt(manifest, type, format, length, sharedContext, context, input)
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
    type: AISummarizerType,
    format: AISummarizerFormat,
    length: AISummarizerLength,
    sharedContext: string,
    context: string,
    input: string
  ) {
    if (!manifest.prompts[AIModelPromptType.Summarizer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AIModelPromptType.Summarizer]
    const template = new Template(config.template)
    return template.render({
      type,
      format,
      length,
      shared_context: sharedContext,
      context,
      input,
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken,
      add_generation_prompt: true
    })
  }
}

export default AISummarizerHandler
