import { getNonEmptyString } from '#Shared/API/Untrusted/UntrustedParser'
import { AITranslatorData } from '#Shared/API/AITranslator/AITranslatorTypes'
import {
  kTranslatorGetCapabilities,
  kTranslatorCreate,
  kTranslatorDestroy,
  kTranslatorTranslate
} from '#Shared/API/AITranslator/AITranslatorIPCTypes'
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
import capitalize from 'capitalize'
import { parse as partialJsonParse } from 'best-effort-json-parser'

class AITranslatorHandler {
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
      .addRequestHandler(kTranslatorGetCapabilities, this.#handleGetCapabilities)
      .addRequestHandler(kTranslatorCreate, this.#handleCreate)
      .addRequestHandler(kTranslatorDestroy, this.#handleDestroy)
      .addRequestHandler(kTranslatorTranslate, this.#handleTranslate)
  }

  /* **************************************************************************/
  // MARK: Handlers: Capabilities
  /* **************************************************************************/

  #handleGetCapabilities = async (channel: IPCInflightChannel) => {
    return APIHelper.handleGetStandardCapabilitiesData(channel, AIModelType.Text, AICapabilityPromptType.Translator)
  }

  /* **************************************************************************/
  // MARK: Handlers: Lifecycle
  /* **************************************************************************/

  #handleCreate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardCreatePreflight(channel, AIModelType.Text, AICapabilityPromptType.Translator, async (
      manifest,
      payload,
      props
    ) => {
      return {
        sessionId: nanoid(),
        props: {
          ...props,
          sourceLanguage: payload.getNonEmptyString('sourceLanguage'),
          targetLanguage: payload.getNonEmptyString('targetLanguage')
        }
      } as AITranslatorData
    })
  }

  #handleDestroy = async (channel: IPCInflightChannel) => {
    return await AILlmSession.disposePromptSession(getNonEmptyString(channel.payload.sessionId))
  }

  /* **************************************************************************/
  // MARK: Language detector
  /* **************************************************************************/

  #handleTranslate = async (channel: IPCInflightChannel) => {
    return await APIHelper.handleStandardPromptPreflight(channel, AIModelType.Text, async (
      manifest,
      payload,
      props
    ) => {
      const sourceLanguage = payload.getNonEmptyString('props.sourceLanguage')
      const targetLanguage = payload.getNonEmptyString('props.targetLanguage')
      const input = payload.getString('input')
      const targetSections = []

      for (const sourceSection of input.split('\n')) {
        if (sourceSection.length === 0) {
          targetSections.push(sourceSection)
          continue
        }

        const prompt = this.#getPrompt(manifest, sourceLanguage, targetLanguage, sourceSection)
        const sessionId = payload.getNonEmptyString('sessionId')

        let chunkBuffer = ''
        let translation: string
        await AILlmSession.prompt(
          sessionId,
          prompt,
          {
            ...props,
            grammar: {
              type: 'object',
              properties: {
                translation: { type: 'string' }
              },
              required: ['translation'],
              additionalProperties: false
            }
          },
          {
            signal: channel.abortSignal,
            stream: (chunk: string) => {
              chunkBuffer += chunk
              try {
                translation = partialJsonParse(chunkBuffer).translation
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

  #getPrompt (
    manifest: AIModelManifest,
    sourceLanguage: string,
    targetLanguage: string,
    input: string
  ) {
    if (!manifest.prompts[AICapabilityPromptType.Translator]) {
      throw new Error(kModelPromptTypeNotSupported)
    }
    const config = manifest.prompts[AICapabilityPromptType.Translator]
    const template = new Template(config.template)
    const sourceLanguageName = (new Intl.DisplayNames([sourceLanguage], { type: 'language' })).of(sourceLanguage)
    const targetLanguageName = (new Intl.DisplayNames([targetLanguage], { type: 'language' })).of(targetLanguage)
    return template.render({
      input,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      source_language_name: capitalize(sourceLanguageName),
      target_language_name: capitalize(targetLanguageName),
      bos_token: manifest.tokens.bosToken,
      eos_token: manifest.tokens.eosToken
    })
  }
}

export default AITranslatorHandler
