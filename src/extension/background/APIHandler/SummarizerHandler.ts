import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kSummarizerCompatibility,
  kSummarizerAvailability,
  kSummarizerCreate,
  kSummarizerDestroy,
  kSummarizerPrompt,
  kSummarizerMeasureInput
} from '#Shared/API/Summarizer/SummarizerIPCTypes'
import {
  SummarizerState,
  SummarizerFormat,
  SummarizerType,
  SummarizerLength
} from '#Shared/API/Summarizer/SummarizerTypes'
import APIHelper from './APIHelper'
import {
  AIModelType,
  AIModelPromptType
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

class SummarizerHandler {
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
      .addRequestHandler(kSummarizerAvailability, this.#handleGetAvailability)
      .addRequestHandler(kSummarizerCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kSummarizerCreate, this.#handleCreate)
      .addRequestHandler(kSummarizerDestroy, this.#handleDestroy)
      .addRequestHandler(kSummarizerPrompt, this.#handlePrompt)
      .addRequestHandler(kSummarizerMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getPrompt (
    manifest: AIModelManifest,
    type: SummarizerType,
    format: SummarizerFormat,
    length: SummarizerLength,
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

  /* **************************************************************************/
  // MARK: Handlers: Availability & compatibility
  /* **************************************************************************/

  #handleGetAvailability = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.Summarizer)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.Summarizer)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Summarizer, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: SummarizerState }> => {
      const state: SummarizerState = {
        ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
        sharedContext: payload.getNonEmptyString('sharedContext'),
        type: payload.getEnum('type', SummarizerType, SummarizerType.Tldr),
        format: payload.getEnum('format', SummarizerFormat, SummarizerFormat.Markdown),
        length: payload.getEnum('length', SummarizerLength, SummarizerLength.Medium),
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
        payload.getEnum('state.type', SummarizerType, SummarizerType.Tldr),
        payload.getEnum('state.format', SummarizerFormat, SummarizerFormat.Markdown),
        payload.getEnum('state.length', SummarizerLength, SummarizerLength.Medium),
        payload.getString('state.sharedContext'),
        payload.getString('options.context'),
        payload.getString('input')
      )

      const coreState = await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)
      const usage = await AILlmSession.countTokens(prompt, coreState, {})
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
        payload.getEnum('state.type', SummarizerType, SummarizerType.Tldr),
        payload.getEnum('state.format', SummarizerFormat, SummarizerFormat.Markdown),
        payload.getEnum('state.length', SummarizerLength, SummarizerLength.Medium),
        payload.getString('state.sharedContext'),
        payload.getString('options.context'),
        payload.getString('input')
      )

      const coreState = await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)
      await AILlmSession.prompt(
        sessionId,
        prompt,
        coreState,
        {
          signal: channel.abortSignal,
          stream: (chunk: string) => channel.emit(chunk)
        }
      )

      return { }
    })
  }
}

export default SummarizerHandler
