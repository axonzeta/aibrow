import {
  LanguageModelMessageType,
  LanguageModelMessageRole
} from '#Shared/API2/LanguageModel/LanguageModelTypes'
import LanguageModel from '#Shared/API2/LanguageModel/LanguageModel'
import {
  RewriterTone,
  RewriterLength,
  RewriterFormat
} from '#Shared/API2/Rewriter/RewriterTypes'
import Rewriter from '#Shared/API2/Rewriter/Rewriter'
import {
  SummarizerLength,
  SummarizerFormat,
  SummarizerType
} from '#Shared/API2/Summarizer/SummarizerTypes'
import Summarizer from '#Shared/API2/Summarizer/Summarizer'
import {
  WriterTone,
  WriterLength,
  WriterFormat
} from '#Shared/API2/Writer/WriterTypes'
import Writer from '#Shared/API2/Writer/Writer'
import AIBrow from './AIBrow'

const genericWindow = window as any

// Expose aibrow
genericWindow.aibrow = AIBrow

// Polyfill for the main window
if (!genericWindow.LanguageModel) {
  genericWindow.LanguageModel = AIBrow.LanguageModel
}
if (!genericWindow.Rewriter) {
  genericWindow.Rewriter = AIBrow.Rewriter
}
if (!genericWindow.Summarizer) {
  genericWindow.Summarizer = AIBrow.Summarizer
}
if (!genericWindow.Writer) {
  genericWindow.Writer = AIBrow.Writer
}

export {
  LanguageModelMessageType,
  LanguageModelMessageRole,
  LanguageModel,

  RewriterTone,
  RewriterLength,
  RewriterFormat,
  Rewriter,

  SummarizerLength,
  SummarizerFormat,
  SummarizerType,
  Summarizer,

  WriterTone,
  WriterLength,
  WriterFormat,
  Writer
}
export default AIBrow

//todo add genericWindow.ai?.__aibrowOverride === true support
//todo window.translation
//todo embedding