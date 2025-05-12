import IPCRegistrar from '#Shared/API2/IPCRegistrar'
import IPC from './IPC'
import LanguageModel from '#Shared/API2/LanguageModel/LanguageModel'
import Rewriter from '#Shared/API2/Rewriter/Rewriter'
import Summarizer from '#Shared/API2/Summarizer/Summarizer'
import Writer from '#Shared/API2/Writer/Writer'

IPCRegistrar.ipc = IPC

const genericWindow = window as any

// Expose aibrow
const aibrow = {
  LanguageModel,
  Rewriter
}
genericWindow.aibrow = aibrow

// Polyfill for the main window
if (!genericWindow.LanguageModel) {
  genericWindow.LanguageModel = LanguageModel
}
if (!genericWindow.Rewriter) {
  genericWindow.Rewriter = Rewriter
}
if (!genericWindow.Summarizer) {
  genericWindow.Summarizer = Summarizer
}
if (!genericWindow.Writer) {
  genericWindow.Writer = Writer
}

export {
  LanguageModel,
  Rewriter,
  Summarizer,
  Writer
}
export default aibrow

//todo
/*import AI from './AI'
import Translation from './Translation'
import {
  AIExtensionCapabilities,
  AICapabilityAvailability,
  AIModelGpuEngine,
  AIModelDType,
  AIExtensionHelperInstalledState
} from '#Shared/API/AI'
import {
  AILanguageModelInitialPromptRole,
  AILanguageModelPromptRole
} from '#Shared/API/AILanguageModel/AILanguageModelTypes'
import {
  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterTone
} from '#Shared/API/AIRewriter/AIRewriterTypes'
import {
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerType
} from '#Shared/API/AISummarizer/AISummarizerTypes'
import {
  AIWriterFormat,
  AIWriterLength,
  AIWriterTone
} from '#Shared/API/AIWriter/AIWriterTypes'

export const ai = new AI(window.ai)
export const translation = new Translation(ai, (window as any).translation)

const genericWindow = window as any

// Add overrides for the M135- origin trials
if (!genericWindow.ai || genericWindow.ai?.__aibrowOverride === true) {
  genericWindow.ai = ai
}
if (!genericWindow.translation || genericWindow.translation?.__aibrowOverride === true) {
  genericWindow.translation = translation
}

// Expose aibrow
genericWindow.aibrow = ai
genericWindow.aibrowTranslation = translation

export default ai
export {
  AIExtensionCapabilities,
  AICapabilityAvailability,
  AIModelGpuEngine,
  AIModelDType,
  AIExtensionHelperInstalledState,

  AILanguageModelInitialPromptRole,
  AILanguageModelPromptRole,

  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterTone,

  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerType,

  AIWriterFormat,
  AIWriterLength,
  AIWriterTone
}
*/