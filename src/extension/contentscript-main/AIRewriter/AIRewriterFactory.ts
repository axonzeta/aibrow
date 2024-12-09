import AIRewriter from './AIRewriter'
import {
  AIRewriterCapabilitiesOptions,
  AIRewriterCapabilitiesData,
  AIRewriterCreateOptions,
  AIRewriterData
} from '#Shared/API/AIRewriter/AIRewriterTypes'
import AIRewriterCapabilities from './AIRewriterCapabilities'
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
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AIRewriterCapabilitiesOptions): Promise<AIRewriterCapabilities> => {
    const data = throwIPCErrorResponse(
      await IPC.request(kRewriterGetCapabilities, options)
    ) as AIRewriterCapabilitiesData

    return new AIRewriterCapabilities(data)
  }

  /* **************************************************************************/
  // MARK: Creation
  /* **************************************************************************/

  create = async (options: AIRewriterCreateOptions = {}) => {
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
