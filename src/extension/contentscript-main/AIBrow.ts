import IPCRegistrar from '#Shared/API/IPCRegistrar'
import IPC from './IPC'
import {
  kAIBrowGetCapabilities,
  kAIBrowGetNativeHelperDownloadUrl
} from '#Shared/API/AIBrowIPCTypes'
import { throwIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import { AIBrowExtensionCapabilities } from '#Shared/API/AIBrowTypes'
import Embedding from '#Shared/API/Embedding/Embedding'
import LanguageDetector from '#Shared/API/LanguageDetector/LanguageDetector'
import LanguageModel from '#Shared/API/LanguageModel/LanguageModel'
import Rewriter from '#Shared/API/Rewriter/Rewriter'
import Summarizer from '#Shared/API/Summarizer/Summarizer'
import Translator from '#Shared/API/Translator/Translator'
import Writer from '#Shared/API/Writer/Writer'

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

  /* **************************************************************************/
  // MARK: Overriding
  /* **************************************************************************/

  overrideBrowserAPI (force = false) {
    const genericWindow = window as any

    // Polyfill for the main window
    if (force || !genericWindow.LanguageDetector) {
      genericWindow.LanguageDetector = this.LanguageDetector
    }
    if (force || !genericWindow.LanguageModel) {
      genericWindow.LanguageModel = this.LanguageModel
    }
    if (force || !genericWindow.Rewriter) {
      genericWindow.Rewriter = this.Rewriter
    }
    if (force || !genericWindow.Summarizer) {
      genericWindow.Summarizer = this.Summarizer
    }
    if (force || !genericWindow.Translator) {
      genericWindow.Translator = this.Translator
    }
    if (force || !genericWindow.Writer) {
      genericWindow.Writer = this.Writer
    }
  }
}

export default new AIBrow()
