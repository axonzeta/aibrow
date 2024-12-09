import { AILanguageDetectorCapabilitiesData } from './AILanguageDetectorTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AILanguageDetectorCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AILanguageDetectorCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }
}

export default AILanguageDetectorCapabilities
