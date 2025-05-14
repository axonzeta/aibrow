import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  kLanguageDetectorCompatibility,
  kLanguageDetectorAvailability,
  kLanguageDetectorCreate,
  kLanguageDetectorDestroy,
  kLanguageDetectorPrompt,
  kLanguageDetectorMeasureInput
} from '#Shared/API/LanguageDetector/LanguageDetectorIPCTypes'
import {
  LanguageDetectorState,
  LanguageDetectorDetectionResult,
  LanguageDetectorDefaultLanguages
} from '#Shared/API/LanguageDetector/LanguageDetectorTypes'
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

const noop = () => {}

class LanguageDetectorHandler {
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
      .addRequestHandler(kLanguageDetectorAvailability, this.#handleGetAvailability)
      .addRequestHandler(kLanguageDetectorCompatibility, this.#handleGetCompatibility)
      .addRequestHandler(kLanguageDetectorCreate, this.#handleCreate)
      .addRequestHandler(kLanguageDetectorDestroy, this.#handleDestroy)
      .addRequestHandler(kLanguageDetectorPrompt, this.#handlePrompt)
      .addRequestHandler(kLanguageDetectorMeasureInput, this.#handleMeasureInput)
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getPrompt (
    manifest: AIModelManifest,
    input: string
  ) {
    if (!manifest.prompts[AIModelPromptType.LanguageDetector]) {
      throw new Error(kModelPromptTypeNotSupported)
    }

    const config = manifest.prompts[AIModelPromptType.LanguageDetector]
    const template = new Template(config.template)
    return template.render({
      input,
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken,
      add_generation_prompt: true
    })
  }

  #buildStateFromPayload = async (manifest: AIModelManifest, payload: TypoObject) => {
    return {
      ...await APIHelper.getCoreModelState(manifest, AIModelType.Text, payload),
      inputQuota: manifest.tokens.max
    } as LanguageDetectorState
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
    return APIHelper.handleGetStandardAvailability(channel, AIModelType.Text, AIModelPromptType.LanguageDetector)
  }

  #handleGetCompatibility = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCompatibility(channel, AIModelType.Text, AIModelPromptType.LanguageDetector)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AIModelPromptType.LanguageDetector, async (
      manifest,
      payload
    ): Promise<{ sessionId: string, state: LanguageDetectorState }> => {
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
      const prompt = this.#getPrompt(
        manifest,
        payload.getString('input')
      )

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
      const input = payload.getString('input')
      const prompt = this.#getPrompt(manifest, input)
      const sessionId = payload.getNonEmptyString('sessionId')
      const results: LanguageDetectorDetectionResult[] = []

      const corePromptProps = await this.#buildPromptPropsFromPayload(manifest, payload)
      for (let i = 0; i < 1; i++) {
        const detectedLanguage = new Set(results.map(result => result.detectedLanguage))
        const languages = LanguageDetectorDefaultLanguages.filter((language) => !detectedLanguage.has(language))

        const result = JSON.parse(await AILlmSession.prompt(
          sessionId,
          prompt,
          {
            ...corePromptProps,
            grammar: {
              type: 'object',
              properties: {
                detectedLanguage: {
                  type: 'string',
                  enum: languages
                },
                confidence: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 100
                }
              },
              required: ['detectedLanguage', 'confidence'],
              additionalProperties: false
            }
          },
          {
            signal: channel.abortSignal,
            stream: noop
          }
        ))

        results.push({
          detectedLanguage: result.detectedLanguage,
          confidence: result.confidence / 100
        } as LanguageDetectorDetectionResult)
      }

      return results
    })
  }
}

export default LanguageDetectorHandler
