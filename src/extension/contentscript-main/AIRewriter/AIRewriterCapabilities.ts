import { AICapabilityAvailability } from '#Shared/API/AICapability'
import {
  AIRewriterTone,
  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterCapabilitiesData
} from '#Shared/API/AIRewriter/AIRewriterTypes'

class AIRewriterCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AIRewriterCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIRewriterCapabilitiesData) {
    this.#data = data
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get available () { return this.#data.available }

  get aibrow () { return true }

  /* **************************************************************************/
  // MARK: Features
  /* **************************************************************************/

  supportsTone = (tone: AIRewriterTone) => {
    return Object.values(AIRewriterTone).includes(tone)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsFormat = (format: AIRewriterFormat) => {
    return Object.values(AIRewriterFormat).includes(format)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsLength = (length: AIRewriterLength) => {
    return Object.values(AIRewriterLength).includes(length)
      ? this.available
      : AICapabilityAvailability.No
  }

  /* **************************************************************************/
  // MARK: Language
  /* **************************************************************************/

  supportsInputLanguage = (language: string) => {
    const supports = this.#data.supportedLanguages
      ? this.#data.supportedLanguages.includes(language)
      : true
    return supports
      ? AICapabilityAvailability.Readily
      : AICapabilityAvailability.No
  }
}

export default AIRewriterCapabilities
