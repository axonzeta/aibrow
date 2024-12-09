import { AICapabilityAvailability } from '../AICapability'
import {
  AISummarizerType,
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerCapabilitiesData
} from './AISummarizerTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AISummarizerCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AISummarizerCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }

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
}

export default AISummarizerCapabilities
