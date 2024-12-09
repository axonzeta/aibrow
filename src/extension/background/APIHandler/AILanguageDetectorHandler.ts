import { getNonEmptyString } from '#Shared/Typo/TypoParser'
import {
  AILanguageDetectorData,
  AILanguageDetectorDetectResult,
  AILanguageDetectorDefaultLanguages
} from '#Shared/API/AILanguageDetector/AILanguageDetectorTypes'
import {
  kLanguageDetectorGetCapabilities,
  kLanguageDetectorCreate,
  kLanguageDetectorDestroy,
  kLanguageDetectorDetect
} from '#Shared/API/AILanguageDetector/AILanguageDetectorIPCTypes'
import {
  IPCServer,
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import APIHelper from './APIHelper'
import AILlmSession from '../AI/AILlmSession'
import { nanoid } from 'nanoid'
import { AIModelManifest } from '#Shared/AIModelManifest'
import { Template } from '@huggingface/jinja'
import { AICapabilityPromptType, AIModelType } from '#Shared/API/AI'
import { kModelPromptTypeNotSupported } from '#Shared/Errors'

const noop = () => {}

class AILanguageDetectorHandler {
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
      .addRequestHandler(kLanguageDetectorGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kLanguageDetectorCreate, this.#handleCreate)
      .addRequestHandler(kLanguageDetectorDestroy, this.#handleDestroy)
      .addRequestHandler(kLanguageDetectorDetect, this.#handleDetect)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AICapabilityPromptType.LanguageDetector)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AICapabilityPromptType.LanguageDetector, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props
      } as AILanguageDetectorData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Language detector
  /* **************************************************************************/

  #handleDetect = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const input = payload.getString('input')
      const prompt = this.#getPrompt(manifest, input)
      const sessionId = payload.getNonEmptyString('sessionId')
      const results: AILanguageDetectorDetectResult[] = []

      for (let i = 0; i < 1; i++) {
        const detectedLanguage = new Set(results.map(result => result.detectedLanguage))
        const languages = AILanguageDetectorDefaultLanguages.filter((language) => !detectedLanguage.has(language))

        const result = JSON.parse(await AILlmSession.prompt(
          sessionId,
          prompt,
          {
            ...props,
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
        } as AILanguageDetectorDetectResult)
      }

      return results
    })
  }

  #getPrompt (
    manifest: AIModelManifest,
    input: string
  ) {
    if (!manifest.prompts[AICapabilityPromptType.LanguageDetector]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AICapabilityPromptType.LanguageDetector]
    const template = new Template(config.template)
    return template.render({
      input,
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken,
      add_generation_prompt: true
    })
  }
}

export default AILanguageDetectorHandler
