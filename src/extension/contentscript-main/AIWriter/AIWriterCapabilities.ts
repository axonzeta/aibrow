import { AICapabilityAvailability } from '#Shared/API/AICapability'
import {
  AIWriterTone,
  AIWriterFormat,
  AIWriterLength,
  AIWriterCapabilitiesData
} from '#Shared/API/AIWriter/AIWriterTypes'

class AIWriterCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AIWriterCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIWriterCapabilitiesData) {
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

  supportsTone = (tone: AIWriterTone) => {
    return Object.values(AIWriterTone).includes(tone)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsFormat = (format: AIWriterFormat) => {
    return Object.values(AIWriterFormat).includes(format)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsLength = (length: AIWriterLength) => {
    return Object.values(AIWriterLength).includes(length)
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

export default AIWriterCapabilities
