import { AICapabilityAvailability } from '#Shared/API/AICapability'
import {
  AISummarizerType,
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerCapabilitiesData
} from '#Shared/API/AISummarizer/AISummarizerTypes'

class AISummarizerCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AISummarizerCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AISummarizerCapabilitiesData) {
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

  supportsType = (type: AISummarizerType) => {
    return Object.values(AISummarizerType).includes(type)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsFormat = (format: AISummarizerFormat) => {
    return Object.values(AISummarizerFormat).includes(format)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsLength = (length: AISummarizerLength) => {
    return Object.values(AISummarizerLength).includes(length)
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

export default AISummarizerCapabilities
