import {
  AILanguageDetectorData,
  AILanguageDetectorProps,
  AILanguageDetectorCloneOptions,
  AILanguageDetectorDetectOptions,
  AILanguageDetectorDetectResult
} from './AILanguageDetectorTypes'
import { kLanguageDetectorCreate, kLanguageDetectorDetect } from './AILanguageDetectorIPCTypes'
import { kSessionDestroyed } from '../../Errors'
import AIRootModel from '../AIRootModel'
import IPCClient from '../../IPC/IPCClient'

class AILanguageDetector extends AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient
  #sessionId: string
  #props: AILanguageDetectorProps
  #signal?: AbortSignal
  #destroyed = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient, data: AILanguageDetectorData, signal?: AbortSignal) {
    super(data.props)
    this.#ipc = ipc
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
    const data = (await this.#ipc.request(kLanguageDetectorCreate, this.#props, { signal })) as AILanguageDetectorData
    const session = new AILanguageDetector(this.#ipc, data)
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

    const result = (await this.#ipc.request(kLanguageDetectorDetect, { props: this.#props, input }, { signal })) as AILanguageDetectorDetectResult[]
    return result
  }
}

export default AILanguageDetector
