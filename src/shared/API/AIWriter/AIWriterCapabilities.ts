import { AICapabilityAvailability } from '../AICapability'
import {
  AIWriterTone,
  AIWriterFormat,
  AIWriterLength,
  AIWriterCapabilitiesData
} from './AIWriterTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AIWriterCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIWriterCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }

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
}

export default AIWriterCapabilities
