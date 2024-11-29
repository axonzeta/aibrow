import {
  AIEmbeddingVector,
  AIEmbeddingGetOptions,
  AIEmbeddingData,
  AIEmbeddingProps,
  AIEmbeddingCloneOptions
} from '#Shared/API/AIEmbedding/AIEmbeddingTypes'
import IPC from '../IPC'
import { kEmbeddingCreate, kEmbeddingGet } from '#Shared/API/AIEmbedding/AIEmbeddingIPCTypes'
import { kSessionDestroyed } from '#Shared/Errors'
import AIRootModel from '../AIRootModel'
import { calculateCosineSimilarity, findSimilar } from './AIEmbeddingUtil'

class AIEmbedding extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AIEmbeddingProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AIEmbeddingData, signal?: AbortSignal) {
    super(data.props)
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AIEmbeddingCloneOptions = {}): Promise<AIEmbedding> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kEmbeddingCreate, this.#props, { signal })) as AIEmbeddingData
    const session = new AIEmbedding(data)
    return session
  }

  destroy = () => {
    this.#destroyed = true
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Summarizing
  /* **************************************************************************/

  get = async (input: string | string[], options: AIEmbeddingGetOptions = {}): Promise<AIEmbeddingVector | AIEmbeddingVector[]> => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    const inputs = Array.isArray(input) ? input : [input]
    const embedding = (await IPC.request(kEmbeddingGet, { props: this.#props, inputs }, { signal })) as AIEmbeddingVector | AIEmbeddingVector[]

    return Array.isArray(input)
      ? embedding as AIEmbeddingVector[]
      : embedding[0] as AIEmbeddingVector
  }

  /* **************************************************************************/
  // MARK: Comparison utils
  /* **************************************************************************/

  calculateCosineSimilarity = calculateCosineSimilarity

  findSimilar = findSimilar
}

export default AIEmbedding
