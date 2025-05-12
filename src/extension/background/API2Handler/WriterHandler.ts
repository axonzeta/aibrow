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
} from '#Shared/API2/Writer/WriterIPCTypes'
import {
  WriterState,
  WriterFormat,
  WriterTone,
  WriterLength
} from '#Shared/API2/Writer/WriterTypes'
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
    tone: WriterTone,
    format: WriterFormat,
    length: WriterLength,
    sharedContext: string,
    context: string,
    input: string
  ) {
    if (!manifest.prompts[AIModelPromptType.Writer]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

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
      const state: WriterState = {
        ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
        sharedContext: payload.getNonEmptyString('sharedContext'),
        tone: payload.getEnum('tone', WriterTone, WriterTone.Neutral),
        format: payload.getEnum('format', WriterFormat, WriterFormat.Markdown),
        length: payload.getEnum('length', WriterLength, WriterLength.Short),
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
        payload.getEnum('state.tone', WriterTone, WriterTone.Neutral),
        payload.getEnum('state.format', WriterFormat, WriterFormat.Markdown),
        payload.getEnum('state.length', WriterLength, WriterLength.Short),
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
        payload.getEnum('state.tone', WriterTone, WriterTone.Neutral),
        payload.getEnum('state.format', WriterFormat, WriterFormat.Markdown),
        payload.getEnum('state.length', WriterLength, WriterLength.Short),
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

export default WriterHandler
