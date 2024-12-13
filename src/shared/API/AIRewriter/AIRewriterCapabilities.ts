import { AICapabilityAvailability } from '../AI'
import {
  AIRewriterTone,
  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterCapabilitiesData
} from './AIRewriterTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AIRewriterCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIRewriterCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }

  /* **************************************************************************/
  // MARK: Features
  /* **************************************************************************/

  supportsTone = (tone: AIRewriterTone) => {
    return Object.values(AIRewriterTone).includes(tone)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsFormat = (format: AIRewriterFormat) => {
    return Object.values(AIRewriterFormat).includes(format)
      ? this.available
      : AICapabilityAvailability.No
  }

  supportsLength = (length: AIRewriterLength) => {
    return Object.values(AIRewriterLength).includes(length)
      ? this.available
      : AICapabilityAvailability.No
  }
}

export default AIRewriterCapabilities
