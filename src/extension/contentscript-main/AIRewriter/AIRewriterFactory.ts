import AIRewriter from './AIRewriter'
import {
  AIRewriterCapabilitiesOptions,
  AIRewriterCapabilitiesData,
  AIRewriterCreateOptions,
  AIRewriterData
} from '#Shared/API/AIRewriter/AIRewriterTypes'
import AIRewriterCapabilities from './AIRewriterCapabilities'
import Prefs from '../Prefs'
import IPC from '../IPC'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kRewriterCreate,
  kRewriterGetCapabilities
} from '#Shared/API/AIRewriter/AIRewriterIPCTypes'
import { kModelCreationAborted } from '#Shared/Errors'
import { createDownloadProgressFn } from '../AIHelpers'

class AIRewriterFactory {
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
    return typeof (this.#browserAI?.rewriter) === 'object' && await Prefs.getUseBrowserAI()
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AIRewriterCapabilitiesOptions): Promise<AIRewriterCapabilities> => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.rewriter.capabilities(options)
    }

    const data = throwIPCErrorResponse(
      await IPC.request(kRewriterGetCapabilities, options)
    ) as AIRewriterCapabilitiesData

    return new AIRewriterCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AIRewriterCreateOptions = {}) => {
    if (await this.#shouldUseBrowserAI()) {
      return this.#browserAI.rewriter.create(options)
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
        kRewriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIRewriterData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIRewriter(data, options.signal)
  }
}

export default AIRewriterFactory
