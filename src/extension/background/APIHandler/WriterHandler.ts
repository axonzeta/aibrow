import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kWriterCompatibility,
  kWriterAvailability,
  kWriterCreate,
  kWriterDestroy,
  kWriterPrompt,
  kWriterMeasureInput
} from '#Shared/API/Writer/WriterIPCTypes'
import {
  WriterState,
  WriterFormat,
  WriterTone,
  WriterLength
} from '#Shared/API/Writer/WriterTypes'
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

class WriterHandler {
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
      .addRequestHandler(kWriterAvailability, this.#handleGetAvailability)
      .addRequestHandler(kWriterCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kWriterCreate, this.#handleCreate)
      .addRequestHandler(kWriterDestroy, this.#handleDestroy)
      .addRequestHandler(kWriterPrompt, this.#handlePrompt)
      .addRequestHandler(kWriterMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getPrompt (
    manifest: AIModelManifest,
    payload: TypoObject
  ) {
    if (!manifest.prompts[AIModelPromptType.Writer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

    const tone = payload.getEnum('state.tone', WriterTone, WriterTone.Neutral)
    const format = payload.getEnum('state.format', WriterFormat, WriterFormat.Markdown)
    const length = payload.getEnum('state.length', WriterLength, WriterLength.Short)
    const sharedContext = payload.getString('state.sharedContext')
    const context = payload.getString('options.context')
    const input = payload.getString('input')

    const config = manifest.prompts[AIModelPromptType.Writer]
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
      tone: payload.getEnum('tone', WriterTone, WriterTone.Neutral),
      format: payload.getEnum('format', WriterFormat, WriterFormat.Markdown),
      length: payload.getEnum('length', WriterLength, WriterLength.Short),
      expectedInputLanguages: payload.getStringArray('expectedInputLanguages'),
      expectedContextLanguages: payload.getStringArray('expectedContextLanguages'),
      outputLanguage: payload.getNonEmptyString('outputLanguage'),
      inputQuota: manifest.tokens.max
    } as WriterState
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
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.Writer)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.Writer)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Writer, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: WriterState }> => {
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
      const usage = await AILlmSession.countTokens(prompt, await this.#buildPromptPropsFromPayload(manifest, payload), {})
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

export default WriterHandler
