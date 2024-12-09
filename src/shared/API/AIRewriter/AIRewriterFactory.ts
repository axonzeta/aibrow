import AIRewriter from './AIRewriter'
import {
  AIRewriterCapabilitiesOptions,
  AIRewriterCapabilitiesData,
  AIRewriterCreateOptions,
  AIRewriterData
} from './AIRewriterTypes'
import AIRewriterCapabilities from './AIRewriterCapabilities'
import { throwIPCErrorResponse } from '../../IPC/IPCErrorHelper'
import {
  kRewriterCreate,
  kRewriterGetCapabilities
} from './AIRewriterIPCTypes'
import { kModelCreationAborted } from '../../Errors'
import { createDownloadProgressFn } from '../AIHelpers'
import IPCClient from '../../IPC/IPCClient'

class AIRewriterFactory {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ipc: IPCClient

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ipc: IPCClient) {
    this.#ipc = ipc
  }

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async (options: AIRewriterCapabilitiesOptions): Promise<AIRewriterCapabilities> => {
    const data = throwIPCErrorResponse(
      await this.#ipc.request(kRewriterGetCapabilities, options)
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
      await this.#ipc.stream(
        kRewriterCreate,
        passOptions,
        createDownloadProgressFn(monitorTarget, signal)
      )
    ) as AIRewriterData
    if (signal?.aborted) {
      throw new Error(kModelCreationAborted)
    }

    return new AIRewriter(this.#ipc, data, options.signal)
  }
}

export default AIRewriterFactory
