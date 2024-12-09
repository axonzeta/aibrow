import {
  AICapabilityAvailability,
  AIRootModelCapabilitiesData
} from './AI'

class AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: AIRootModelCapabilitiesData

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIRootModelCapabilitiesData) {
    this.#data = data
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get aibrow () { return true }
  get available () { return this.#data.available }
  get gpuEngines () { return this.#data.gpuEngines }
  get score () { return this.#data.score }

  get defaultTopK () { return this.#data.topK?.[1] ?? null }
  get maxTopK () { return this.#data.topK?.[2] ?? null }

  get defaultTopP () { return this.#data.topP?.[1] ?? null }
  get maxTopP () { return this.#data.topP?.[2] ?? null }

  get defaultTemperature () { return this.#data.temperature?.[1] ?? null }
  get maxTemperature () { return this.#data.temperature?.[2] ?? null }

  get defaultRepeatPenalty () { return this.#data.repeatPenalty?.[1] ?? null }
  get maxRepeatPenalty () { return this.#data.repeatPenalty?.[2] ?? null }

  get defaultFlashAttention () { return this.#data.flashAttention ?? null }

  get defaultContextSize () { return this.#data.contextSize?.[1] ?? null }
  get maxContextSize () { return this.#data.contextSize?.[2] ?? null }

  /* **************************************************************************/
  // MARK: Getters
  /* **************************************************************************/

  supportsLanguage = (language: string): AICapabilityAvailability => {
    const supports = this.#data.supportedLanguages
      ? this.#data.supportedLanguages.includes(language)
      : true
    return supports
      ? AICapabilityAvailability.Readily
      : AICapabilityAvailability.No
  }
}

export default AIRootModelCapabilities
