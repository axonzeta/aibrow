import { AICoreModelCapabilitiesData } from './AICoreModelTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AICoreModelCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AICoreModelCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }
}

export default AICoreModelCapabilities
