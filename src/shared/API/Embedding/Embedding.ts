import {
  AIModelAvailability,
  AICoreModel,
  AIModelCoreCompatibility
} from '../AICoreTypes'
import {
  EmbeddingCreateOptions,
  EmbeddingGetOptions,
  EmbeddingState,
  EmbeddingVector
} from './EmbeddingTypes'
import IPCRegistrar from '../IPCRegistrar'
import {
  kEmbeddingCompatibility,
  kEmbeddingAvailability,
  kEmbeddingCreate,
  kEmbeddingDestroy,
  kEmbeddingGet
} from './EmbeddingIPCTypes'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kModelCreationAborted,
  kSessionDestroyed
} from '../../Errors'
import { createDownloadProgressFn } from '../Helpers'

type AIEmbeddingVectorListItem = Array<{
  id: any
  vector: EmbeddingVector
}>

export class LanguageModel extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static aibrow = true

  static async create (options: EmbeddingCreateOptions = {}): Promise<LanguageModel> {
    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const { sessionId, state } = throwIPCErrorResponse(
      await IPCRegistrar.ipc.stream(
        kEmbeddingCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as { sessionId: string, state: EmbeddingState }
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new LanguageModel(sessionId, options, state)
  }

  static async availability (options: EmbeddingCreateOptions = {}): Promise<AIModelAvailability> {
    const availability = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kEmbeddingAvailability, options)
    ) as AIModelAvailability
    return availability
  }

  static async compatibility (options: EmbeddingCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {
    const compatibility = throwIPCErrorResponse(
      await IPCRegistrar.ipc.request(kEmbeddingCompatibility, options)
    ) as AIModelCoreCompatibility | null
    return compatibility
  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #options: EmbeddingCreateOptions
  #state: EmbeddingState
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (sessionId: string, options: EmbeddingCreateOptions, state: EmbeddingState) {
    super()
    this.#sessionId = sessionId
    this.#options = { ...options }
    this.#state = state

    if (this.#options.signal) {
      this.#options.signal.addEventListener('abort', () => this.destroy())
    }
  }

  destroy = () => {
    this.#destroyed = true
    IPCRegistrar.ipc.request(kEmbeddingDestroy, { sessionId: this.#sessionId })
  }

  #guardDestroyed () {
    if (this.#destroyed) {
      throw new Error(kSessionDestroyed)
    }
  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get gpuEngine () { return this.#state.gpuEngine }

  get dtype () { return this.#state.dtype }

  get flashAttention () { return this.#state.flashAttention }

  get contextSize () { return this.#state.contextSize }

  /* **************************************************************************/
  // MARK: Prompting/chat
  /* **************************************************************************/

  get = async (input: string | string[], options: EmbeddingGetOptions = {}): Promise<EmbeddingVector | EmbeddingVector[]> => {
    this.#guardDestroyed()
    const signal = AbortSignal.any([options.signal, this.#options.signal].filter((s) => s !== undefined))

    const inputs = Array.isArray(input) ? input : [input]
    const embedding = (await IPCRegistrar.ipc.request(kEmbeddingGet, {
      sessionId: this.#sessionId,
      state: this.#state,
      inputs
    }, { signal })) as EmbeddingVector | EmbeddingVector[]

    return Array.isArray(input)
      ? embedding as EmbeddingVector[]
      : embedding[0] as EmbeddingVector
  }

  /* **************************************************************************/
  // MARK: Comparison
  /* **************************************************************************/

  /**
   * Calculates the cosine similarity between two embeddings. Only compare embeddings created
   * by the same model
   * @param vectorA: the first embedding to compare
   * @param vectorB: the second embedding to compare
   * @return a value between 0 and 1 representing the similarity
   */
  calculateCosineSimilarity (vectorA: EmbeddingVector, vectorB: EmbeddingVector): number {
    const vectorALen = vectorA.length
    const vectorBLen = vectorB.length

    if (vectorALen !== vectorBLen) {
      if (vectorALen === 0 || vectorBLen === 0) {
        return 0
      } else {
        throw new Error('Embeddings have different lengths')
      }
    }

    let dotProduct = 0
    let thisMagnitude = 0
    let otherMagnitude = 0
    for (let i = 0; i < vectorALen; i++) {
      dotProduct += vectorA[i] * vectorB[i]
      thisMagnitude += Math.pow(vectorA[i], 2)
      otherMagnitude += Math.pow(vectorB[i], 2)
    }

    if (thisMagnitude === 0 && otherMagnitude === 0) {
      return 1
    } else if (thisMagnitude === 0 || otherMagnitude === 0) {
      return 0
    }

    const thisNorm = Math.sqrt(thisMagnitude)
    const otherNorm = Math.sqrt(otherMagnitude)

    return dotProduct / (thisNorm * otherNorm)
  }

  /**
   * Finds and sorts similar vectors
   * @param embeddings: the list of embeddings to search
   * @param target: the target vector to compare against
   * @returns a list of embedding ids sorted by similarity
   */
  findSimilar (embeddings: AIEmbeddingVectorListItem, target: EmbeddingVector): any[] {
    const similarities = new Map<any, number>()
    for (const { id, vector } of embeddings) {
      similarities.set(id, this.calculateCosineSimilarity(vector, target))
    }

    return Array.from(similarities.keys()).sort((a, b) => (
      similarities.get(b)! - similarities.get(a)!
    ))
  }
}

export default LanguageModel
