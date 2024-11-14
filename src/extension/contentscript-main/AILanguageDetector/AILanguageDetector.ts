import {
  AILanguageDetectorData,
  AILanguageDetectorProps,
  AILanguageDetectorCloneOptions,
  AILanguageDetectorDetectOptions,
  AILanguageDetectorDetectResult
} from '#Shared/API/AILanguageDetector/AILanguageDetectorTypes'
import { kLanguageDetectorCreate, kLanguageDetectorDetect } from '#Shared/API/AILanguageDetector/AILanguageDetectorIPCTypes'
import IPC from '../IPC'
import { kSessionDestroyed } from '#Shared/Errors'
import AIRootModel from '../AIRootModel'

class AILanguageDetector extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #sessionId: string
  #props: AILanguageDetectorProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: AILanguageDetectorData, signal?: AbortSignal) {
    super(data.props)
    this.#sessionId = data.sessionId
    this.#props = data.props
    this.#signal = signal

    if (signal) {
      signal.addEventListener('abort', () => this.destroy())
    }
  }

  clone = async (options: AILanguageDetectorCloneOptions = {}): Promise<AILanguageDetector> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))
    const data = (await IPC.request(kLanguageDetectorCreate, this.#props, { signal })) as AILanguageDetectorData
    const session = new AILanguageDetector(data)
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
  // MARK: Detection
  /* **************************************************************************/

  detect = async (input: string, options: AILanguageDetectorDetectOptions = {}):Promise<AILanguageDetectorDetectResult[]> => {
    this.#guardDestroyed()

    const signal = AbortSignal.any([options.signal, this.#signal].filter(Boolean))

    const result = (await IPC.request(kLanguageDetectorDetect, { props: this.#props, input }, { signal })) as AILanguageDetectorDetectResult[]
    return result
  }
}

export default AILanguageDetector
