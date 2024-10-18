import { AILanguageModelCapabilitiesData } from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import { AICapabilityAvailability } from '#Shared/API/AI'

class AILanguageModelCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AILanguageModelCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AILanguageModelCapabilitiesData) {
    this.#data = data
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get available () { return this.#data.available }
  get aibrow () { return true }
  get gpuEngines () { return this.#data.gpuEngines }
  get defaultTopK () { return this.#data.defaultTopK ?? null }
  get maxTopK () { return this.#data.maxTopK ?? null }
  get defaultTemperature () { return this.#data.defaultTemperature ?? null }
  get maxTemperature () { return this.#data.maxTemperature ?? null }

  /* **************************************************************************/
  // MARK: Getters
  /* **************************************************************************/

  supportsLanguage = (language: string) => {
    const supports = this.#data.supportedLanguages
      ? this.#data.supportedLanguages.includes(language)
      : true
    return supports
      ? AICapabilityAvailability.Readily
      : AICapabilityAvailability.No
  }
}

export default AILanguageModelCapabilities
