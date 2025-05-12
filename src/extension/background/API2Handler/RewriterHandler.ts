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
} from '#Shared/API2/Rewriter/RewriterIPCTypes'
import {
  RewriterState,
  RewriterFormat,
  RewriterTone,
  RewriterLength
} from '#Shared/API2/Rewriter/RewriterTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType
} from '#Shared/API2/AICoreTypes'
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
import {
  TRANS_AIModelCoreState_To_AIRootModelProps
} from '#Shared/API2/Transition'

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
    tone: RewriterTone,
    format: RewriterFormat,
    length: RewriterLength,
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
      const state: RewriterState = {
        ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
        sharedContext: payload.getNonEmptyString('sharedContext'),
        tone: payload.getEnum('tone', RewriterTone, RewriterTone.AsIs),
        format: payload.getEnum('format', RewriterFormat, RewriterFormat.AsIs),
        length: payload.getEnum('length', RewriterLength, RewriterLength.AsIs),
        expectedInputLanguages: payload.getStringArray('expectedInputLanguages'),
        expectedContextLanguages: payload.getStringArray('expectedContextLanguages'),
        outputLanguage: payload.getNonEmptyString('outputLanguage'),
        inputQuota: manifest.tokens.max
      }

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
      const prompt = this.#getPrompt(
        manifest,
        payload.getEnum('state.tone', RewriterTone, RewriterTone.AsIs),
        payload.getEnum('state.format', RewriterFormat, RewriterFormat.AsIs),
        payload.getEnum('state.length', RewriterLength, RewriterLength.AsIs),
        payload.getString('state.sharedContext'),
        payload.getString('options.context'),
        payload.getString('input')
      )

      const coreState = await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)
      const usage = await AILlmSession.countTokens(prompt, TRANS_AIModelCoreState_To_AIRootModelProps(coreState), {})
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
      const prompt = this.#getPrompt(
        manifest,
        payload.getEnum('state.tone', RewriterTone, RewriterTone.AsIs),
        payload.getEnum('state.format', RewriterFormat, RewriterFormat.AsIs),
        payload.getEnum('state.length', RewriterLength, RewriterLength.AsIs),
        payload.getString('state.sharedContext'),
        payload.getString('options.context'),
        payload.getString('input')
      )

      const coreState = await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)
      await AILlmSession.prompt(
        sessionId,
        prompt,
        TRANS_AIModelCoreState_To_AIRootModelProps(coreState),
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
