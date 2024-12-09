import { AILanguageModelCapabilitiesData } from './AILanguageModelTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AILanguageModelCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AILanguageModelCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }
}

export default AILanguageModelCapabilities
