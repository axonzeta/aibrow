import IPCRegistrar from '#Shared/API2/IPCRegistrar'
import IPC from './IPC'
import {
  kAIBrowGetCapabilities,
  kAIBrowGetNativeHelperDownloadUrl
} from '#Shared/API2/AIBrowIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import { AIBrowExtensionCapabilities } from '#Shared/API2/AIBrowTypes'
import Embedding from '#Shared/API2/Embedding/Embedding'
import LanguageDetector from '#Shared/API2/LanguageDetector/LanguageDetector'
import LanguageModel from '#Shared/API2/LanguageModel/LanguageModel'
import Rewriter from '#Shared/API2/Rewriter/Rewriter'
import Summarizer from '#Shared/API2/Summarizer/Summarizer'
import Translator from '#Shared/API2/Translator/Translator'
import Writer from '#Shared/API2/Writer/Writer'

class AIBrow {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    IPCRegistrar.ipc = IPC
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  Embedding = Embedding

  LanguageDetector = LanguageDetector

  LanguageModel = LanguageModel

  Rewriter = Rewriter

  Summarizer = Summarizer

  Translator = Translator

  Writer = Writer

  /* **************************************************************************/
  // MARK: Capabilities
  /* **************************************************************************/

  capabilities = async () => {
    const capabilities = throwIPCErrorResponse(
      await IPC.request(kAIBrowGetCapabilities, {})
    ) as AIBrowExtensionCapabilities
    return capabilities
  }

  getHelperDownloadUrl = async () => {
    const url = await IPC.request(kAIBrowGetNativeHelperDownloadUrl, {})
    return url as string
  }
}

export default new AIBrow()
