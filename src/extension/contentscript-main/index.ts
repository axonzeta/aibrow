import AI from './AI'
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

export const ai = new AI(globalThis.ai)
export const translation = new Translation(ai, (globalThis as any).translation)

const aGlobalThis = globalThis as any

// Add overrides for the M135- origin trials
if (!globalThis.ai || aGlobalThis.ai?.__aibrowOverride === true) {
  aGlobalThis.ai = ai
}
if (!aGlobalThis.translation || aGlobalThis.translation?.__aibrowOverride === true) {
  aGlobalThis.translation = translation
}

// Add overrides for the M136+ origin trials
if (!aGlobalThis.LanguageModel) {
  aGlobalThis.LanguageModel = ai.languageModel
}
if (!aGlobalThis.Summarizer) {
  aGlobalThis.Summarizer = ai.summarizer
}
if (!aGlobalThis.Writer) {
  aGlobalThis.Writer = ai.writer
}
if (!aGlobalThis.Rewriter) {
  aGlobalThis.Rewriter = ai.rewriter
}
if (!aGlobalThis.Translator) {
  aGlobalThis.Translator = translation
}

// Expose aibrow
aGlobalThis.aibrow = ai
aGlobalThis.aibrowTranslation = translation

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
