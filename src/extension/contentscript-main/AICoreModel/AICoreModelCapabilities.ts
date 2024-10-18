import { AICoreModelCapabilitiesData } from '#Shared/API/AICoreModel/AICoreModelTypes'
import { AICapabilityAvailability } from '#Shared/API/AI'

class AICoreModelCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AICoreModelCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AICoreModelCapabilitiesData) {
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

export default AICoreModelCapabilities
