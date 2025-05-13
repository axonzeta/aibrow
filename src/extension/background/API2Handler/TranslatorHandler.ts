import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kTranslatorCompatibility,
  kTranslatorAvailability,
  kTranslatorCreate,
  kTranslatorDestroy,
  kTranslatorPrompt,
  kTranslatorMeasureInput
} from '#Shared/API2/Translator/TranslatorIPCTypes'
import {
  TranslatorState
} from '#Shared/API2/Translator/TranslatorTypes'
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
import capitalize from 'capitalize'
import { parse as partialJsonParse } from 'best-effort-json-parser'

class TranslatorHandler {
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
      .addRequestHandler(kTranslatorAvailability, this.#handleGetAvailability)
      .addRequestHandler(kTranslatorCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kTranslatorCreate, this.#handleCreate)
      .addRequestHandler(kTranslatorDestroy, this.#handleDestroy)
      .addRequestHandler(kTranslatorPrompt, this.#handlePrompt)
      .addRequestHandler(kTranslatorMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getPrompt (
    manifest: AIModelManifest,
    sourceLanguage: string,
    targetLanguage: string,
    input: string
  ) {
    if (!manifest.prompts[AIModelPromptType.Translator]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AIModelPromptType.Translator]
    const template = new Template(config.template)
    const sourceLanguageName = (new Intl.DisplayNames(['en'], { type: 'language' })).of(sourceLanguage)
    const sourceLanguageNameNative = (new Intl.DisplayNames([sourceLanguage], { type: 'language' })).of(sourceLanguage)
    const targetLanguageName = (new Intl.DisplayNames(['en'], { type: 'language' })).of(targetLanguage)
    const targetLanguageNameNative = (new Intl.DisplayNames([targetLanguage], { type: 'language' })).of(targetLanguage)
    return template.render({
      input,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      source_language_name: `${capitalize(sourceLanguageName)} (${sourceLanguageNameNative})`,
      target_language_name: `${capitalize(targetLanguageName)} (${targetLanguageNameNative})`,
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken,
      add_generation_prompt: true
    })
  }

  /* **************************************************************************/
  // MARK: Handlers: Availability & compatibility
  /* **************************************************************************/

  #handleGetAvailability = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.Translator)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.Translator)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.Translator, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: TranslatorState }> => {
      const state: TranslatorState = {
        ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
        sourceLanguage: payload.getNonEmptyString('state.sourceLanguage'),
        targetLanguage: payload.getNonEmptyString('state.targetLanguage'),
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
        payload.getNonEmptyString('state.sourceLanguage'),
        payload.getNonEmptyString('state.targetLanguage'),
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
      const sourceLanguage = payload.getNonEmptyString('state.sourceLanguage')
      const targetLanguage = payload.getNonEmptyString('state.targetLanguage')
      const input = payload.getString('input')
      const targetSections = []

      const coreState = await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload)

      for (const sourceSection of input.split('\n')) {
        if (sourceSection.length === 0) {
          targetSections.push(sourceSection)
          continue
        }

        const prompt = this.#getPrompt(manifest, sourceLanguage, targetLanguage, sourceSection)
        const sessionId = payload.getNonEmptyString('sessionId')

        const translationKey = `translation-${targetLanguage}`
        let chunkBuffer = ''
        let translation: string
        await AILlmSession.prompt(
          sessionId,
          prompt,
          {
            ...TRANS_AIModelCoreState_To_AIRootModelProps(coreState),
            grammar: {
              type: 'object',
              properties: {
                [translationKey]: { type: 'string' }
              },
              required: [translationKey],
              additionalProperties: false
            }
          },
          {
            signal: channel.abortSignal,
            stream: (chunk: string) => {
              chunkBuffer += chunk
              try {
                translation = partialJsonParse(chunkBuffer)[translationKey]
              } catch (ex) { }

              if (translation) {
                channel.emit([...targetSections, translation].join('\n'))
              }
            }
          }
        )

        if (translation) {
          targetSections.push(translation)
        }
      }

      return {}
    })
  }
}

export default TranslatorHandler
