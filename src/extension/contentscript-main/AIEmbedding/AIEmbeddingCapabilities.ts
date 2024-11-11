import { AIEmbeddingCapabilitiesData } from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import AIRootModelCapabilities from '../AIRootModelCapabilities'

class AIEmbeddingCapabilities extends AIRootModelCapabilities {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIEmbeddingCapabilitiesData) { // eslint-disable-line no-useless-constructor
    super(data)
  }
}

export default AIEmbeddingCapabilities
