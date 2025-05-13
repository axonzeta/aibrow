import {
  EmbeddingVector
} from '#Shared/API/Embedding/EmbeddingTypes'
import Embedding from '#Shared/API/Embedding/Embedding'
import {
  LanguageDetectorDetectionResult
} from '#Shared/API/LanguageDetector/LanguageDetectorTypes'
import LanguageDetector from '#Shared/API/LanguageDetector/LanguageDetector'
import {
  LanguageModelMessageType,
  LanguageModelMessageRole
} from '#Shared/API/LanguageModel/LanguageModelTypes'
import LanguageModel from '#Shared/API/LanguageModel/LanguageModel'
import {
  RewriterTone,
  RewriterLength,
  RewriterFormat
} from '#Shared/API/Rewriter/RewriterTypes'
import Rewriter from '#Shared/API/Rewriter/Rewriter'
import {
  SummarizerLength,
  SummarizerFormat,
  SummarizerType
} from '#Shared/API/Summarizer/SummarizerTypes'
import Summarizer from '#Shared/API/Summarizer/Summarizer'
import Translator from '#Shared/API/Translator/Translator'
import {
  WriterTone,
  WriterLength,
  WriterFormat
} from '#Shared/API/Writer/WriterTypes'
import Writer from '#Shared/API/Writer/Writer'
import AIBrow from './AIBrow'
import {
  AIBrowExtensionHelperInstalledState
} from '#Shared/API/AIBrowTypes'

const genericWindow = window as any

// Expose aibrow
genericWindow.aibrow = AIBrow
AIBrow.overrideBrowserAPI(genericWindow.__aibrowOverride === true)

export {
  AIBrowExtensionHelperInstalledState,

  EmbeddingVector,
  Embedding,

  LanguageDetectorDetectionResult,
  LanguageDetector,

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

  Translator,

  WriterTone,
  WriterLength,
  WriterFormat,
  Writer
}
export default AIBrow
