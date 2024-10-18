import {
  AILanguageModelCapabilitiesOptions,
  AILanguageModelCreateOptions,
  AILanguageModelData,
  AILanguageModelCapabilitiesData
} from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import {
  kLanguageModelGetCapabilities,
  kLanguageModelCreate
} from '#Shared/API/AILanguageModel/AILanguageModelIPCTypes'
import Prefs from '../Prefs'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import AILanguageModelCapabilities from './AILanguageModelCapabilities'
import AILanguageModel from './AILanguageModel'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AILanguageModelFactory {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #browserAI: any

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (browserAI: any) {
    this.#browserAI = browserAI
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * @returns true if we should be using the browsers built-in ai for this factory
   */
  async #shouldUseBrowserAI () {
    return typeof (this.#browserAI?.languageModel) === 'object' && await Prefs.getUseBrowserAI()
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AILanguageModelCapabilitiesOptions = {}): Promise<AILanguageModelCapabilities> => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.languageModel.capabilities(options)
    }

    const data = throwIPCErrorResponse(
      await IPC.request(kLanguageModelGetCapabilities, options)
    ) as AILanguageModelCapabilitiesData

    return new AILanguageModelCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AILanguageModelCreateOptions = {}) => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.languageModel.create(options)
    }

    const monitorTarget = new EventTarget()
    const {
      monitor,
      signal,
      ...passOptions
    } = options

    monitor?.(monitorTarget)
    const data = throwIPCErrorResponse(
      await IPC.stream(
        kLanguageModelCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AILanguageModelData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AILanguageModel(data, options.signal)
  }
}

export default AILanguageModelFactory
