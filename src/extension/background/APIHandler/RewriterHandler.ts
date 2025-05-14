import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kRewriterCompatibility,
  kRewriterAvailability,
  kRewriterCreate,
  kRewriterDestroy,
  kRewriterPrompt,
  kRewriterMeasureInput
} from '#Shared/API/Rewriter/RewriterIPCTypes'
import {
  RewriterState,
  RewriterFormat,
  RewriterTone,
  RewriterLength
} from '#Shared/API/Rewriter/RewriterTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType,
  AIModelPromptProps
} from '#Shared/API/AICoreTypes'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { nanoid } from 'nanoid'
import {
  getNonEmptyString
} from '#Shared/Typo/TypoParser'
import {
  kModelPromptTypeNotSupported
} from '#Shared/Errors'
import { Template } from '@huggingface/jinja'
import AILlmSession from '../AI/AILlmSession'
import TypoObject from '#Shared/Typo/TypoObject'

class RewriterHandler {
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
      .addRequestHandler(kRewriterAvailability, this.#handleGetAvailability)
      .addRequestHandler(kRewriterCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kRewriterCreate, this.#handleCreate)
      .addRequestHandler(kRewriterDestroy, this.#handleDestroy)
      .addRequestHandler(kRewriterPrompt, this.#handlePrompt)
      .addRequestHandler(kRewriterMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getPrompt (
    manifest: AIModelManifest,
    payload: TypoObject
  ) {
    if (!manifest.prompts[AIModelPromptType.Rewriter]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

    const tone = payload.getEnum('state.tone', RewriterTone, RewriterTone.AsIs)
    const format = payload.getEnum('state.format', RewriterFormat, RewriterFormat.AsIs)
    const length = payload.getEnum('state.length', RewriterLength, RewriterLength.AsIs)
    const sharedContext = payload.getString('state.sharedContext')
    const context = payload.getString('options.context')
    const input = payload.getString('input')

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

  #buildStateFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
      sharedContext: payload.getNonEmptyString('sharedContext'),
      tone: payload.getEnum('tone', RewriterTone, RewriterTone.AsIs),
      format: payload.getEnum('format', RewriterFormat, RewriterFormat.AsIs),
      length: payload.getEnum('length', RewriterLength, RewriterLength.AsIs),
      expectedInputLanguages: payload.getStringArray('expectedInputLanguages'),
      expectedContextLanguages: payload.getStringArray('expectedContextLanguages'),
      outputLanguage: payload.getNonEmptyString('outputLanguage'),
      inputQuota: manifest.tokens.max
    } as RewriterState
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
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.Rewriter)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.Rewriter)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Rewriter, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: RewriterState }> => {
      const state = await this.#buildStateFromPayload(manifest, payload)
      return { sessionId: nanoid(), state }
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposeSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Handlers: Token counting
  /* **************************************************************************/

  #handleMeasureInput = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const prompt = this.#getPrompt(manifest, payload)
      const usage = await AILlmSession.countTokens(
        prompt,
        await this.#buildPromptPropsFromPayload(manifest, payload),
        {}
      )
      return usage
    })
  }

  /* **************************************************************************/
  // MARK: Handlers: Prompts
  /* **************************************************************************/

  /**
   * Sends the session prompt to the native binary with the updated payload
   * @param channel: the IPC channel that is being processed
   * @returns the stream response
   */
  #handlePrompt = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload
    ) => {
      const sessionId = payload.getNonEmptyString('sessionId')
      const prompt = this.#getPrompt(manifest, payload)
      await AILlmSession.prompt(
        sessionId,
        prompt,
        await this.#buildPromptPropsFromPayload(manifest, payload),
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )

      return { }
    })
  }
}

export default RewriterHandler
