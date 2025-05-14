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
  AIModelPromptType,
  AIModelPromptProps
} from '#Shared/API/AICoreTypes'
import { AIModelManifest } from '#Shared/AIModelManifest'
import {
  getNonEmptyString
} from '#Shared/Typo/TypoParser'
import {
  kModelPromptTypeNotSupported
} from '#Shared/Errors'
import { Template } from '@huggingface/jinja'
import AILlmSession from '../AI/AILlmSession'
import TypoObject from '#Shared/Typo/TypoObject'

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
    payload: TypoObject
  ) {
    if (!manifest.prompts[AIModelPromptType.Summarizer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

    const type = payload.getEnum('state.type', SummarizerType, SummarizerType.Tldr)
    const format = payload.getEnum('state.format', SummarizerFormat, SummarizerFormat.Markdown)
    const length = payload.getEnum('state.length', SummarizerLength, SummarizerLength.Medium)
    const sharedContext = payload.getString('state.sharedContext')
    const context = payload.getString('options.context')
    const input = payload.getString('input')

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

  #buildStateFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
      sharedContext: payload.getNonEmptyString('sharedContext'),
      type: payload.getEnum('type', SummarizerType, SummarizerType.Tldr),
      format: payload.getEnum('format', SummarizerFormat, SummarizerFormat.Markdown),
      length: payload.getEnum('length', SummarizerLength, SummarizerLength.Medium),
      expectedInputLanguages: payload.getStringArray('expectedInputLanguages'),
      expectedContextLanguages: payload.getStringArray('expectedContextLanguages'),
      outputLanguage: payload.getNonEmptyString('outputLanguage'),
      inputQuota: manifest.tokens.max
    } as SummarizerState
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
      sessionId,
      payload
    ): Promise<{ sessionId: string, state: SummarizerState }> => {
      const state = await this.#buildStateFromPayload(manifest, payload)

      return { sessionId, state }
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
      const sessionId = payload.getNonEmptyString('sessionId')
      const prompt = this.#getPrompt(manifest, payload)

      const usage = await AILlmSession.countTokens(
        sessionId,
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

export default SummarizerHandler
