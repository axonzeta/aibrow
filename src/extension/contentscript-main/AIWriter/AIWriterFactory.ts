import AIWriter from './AIWriter'
import {
  AIWriterCapabilitiesOptions,
  AIWriterCapabilitiesData,
  AIWriterCreateOptions,
  AIWriterData
} from '#Shared/API/AIWriter/AIWriterTypes'
import AIWriterCapabilities from './AIWriterCapabilities'
import Prefs from '../Prefs'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kWriterCreate,
  kWriterGetCapabilities
} from '#Shared/API/AIWriter/AIWriterIPCTypes'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AIWriterFactory {
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
    return typeof (this.#browserAI?.writer) === 'object' && await Prefs.getUseBrowserAI()
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AIWriterCapabilitiesOptions): Promise<AIWriterCapabilities> => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.writer.capabilities(options)
    }

    const data = throwIPCErrorResponse(
      await IPC.request(kWriterGetCapabilities, options)
    ) as AIWriterCapabilitiesData

    return new AIWriterCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AIWriterCreateOptions = {}) => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.writer.create(options)
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
        kWriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIWriterData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIWriter(data, options.signal)
  }
}

export default AIWriterFactory
