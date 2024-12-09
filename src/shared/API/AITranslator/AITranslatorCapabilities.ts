import { AITranslatorCapabilitiesData } from './AITranslatorTypes'
import { AICapabilityAvailability } from '../../API/AI'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AITranslatorCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AITranslatorCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }

  /* **************************************************************************/
  // MARK: Getters
  /* **************************************************************************/

  languagePairAvailable = (sourceLanguage: string, targetLanguage: string) => {
    return (
      this.supportsLanguage(sourceLanguage) === AICapabilityAvailability.Readily &&
      this.supportsLanguage(targetLanguage) === AICapabilityAvailability.Readily
    )
  }
}

export default AITranslatorCapabilities
