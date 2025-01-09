import { getNonEmptyString } from '#Shared/Typo/TypoParser'
import {
  AIRewriterTone,
  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterData
} from '#Shared/API/AIRewriter/AIRewriterTypes'
import {
  kRewriterGetCapabilities,
  kRewriterCreate,
  kRewriterDestroy,
  kRewriterRewrite
} from '#Shared/API/AIRewriter/AIRewriterIPCTypes'
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

class AIRewriterHandler {
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
      .addRequestHandler(kRewriterGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kRewriterCreate, this.#handleCreate)
      .addRequestHandler(kRewriterDestroy, this.#handleDestroy)
      .addRequestHandler(kRewriterRewrite, this.#handleRewrite)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AIModelPromptType.Rewriter)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Rewriter, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          ...props,
          sharedContext: payload.getNonEmptyString('sharedContext'),
          tone: payload.getEnum('tone', AIRewriterTone, AIRewriterTone.AsIs),
          format: payload.getEnum('format', AIRewriterFormat, AIRewriterFormat.AsIs),
          length: payload.getEnum('length', AIRewriterLength, AIRewriterLength.AsIs)
        }
      } as AIRewriterData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Rewriter
  /* **************************************************************************/

  #handleRewrite = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const sharedContext = payload.getString('props.sharedContext')
      const tone = payload.getEnum('props.tone', AIRewriterTone, AIRewriterTone.AsIs)
      const format = payload.getEnum('props.format', AIRewriterFormat, AIRewriterFormat.AsIs)
      const length = payload.getEnum('props.length', AIRewriterLength, AIRewriterLength.AsIs)
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
    tone: AIRewriterTone,
    format: AIRewriterFormat,
    length: AIRewriterLength,
    sharedContext: string,
    context: string,
    input: string
  ) {
    if (!manifest.prompts[AIModelPromptType.Rewriter]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

    const config = manifest.prompts[AIModelPromptType.Rewriter]
    const template = new Template(config.template)
    return template.render({
      tone,
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

export default AIRewriterHandler
