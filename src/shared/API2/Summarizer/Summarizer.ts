import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  SummarizerCreateOptions,
  SummarizerSummarizeOptions
} from './SummarizerTypes'

export class Summarizer extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: SummarizerCreateOptions = {}): Promise<Summarizer> {

  }

  static async availability (options: SummarizerCreateOptions = {}): Promise<AIModelAvailability> {

  }

  static async compatibility (options: SummarizerCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {

  }

  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  destroy = () => {

  }

  /* **************************************************************************/
  // MARK: Properties: Config
  /* **************************************************************************/

  get sharedContext () { }

  get type () { }

  get format () { }

  get length () { }

  get expectedInputLanguages () { }

  get expectedContextLanguages () { }

  get outputLanguage () { }

  get gpuEngine () { }

  get dtype () { }

  get flashAttention () { }

  get contextSize () { }

  /* **************************************************************************/
  // MARK: Properties: Usage
  /* **************************************************************************/

  get inputQuota () { }

  /* **************************************************************************/
  // MARK: Prompting/chat
  /* **************************************************************************/

  summarize = async (input: string, options: SummarizerSummarizeOptions = {}): Promise<string> => {

  }

  summarizeStreaming = async (input: string, options: SummarizerSummarizeOptions = {}): Promise<ReadableStream> => {

  }

  measureInputUsage = async (input: string, options: SummarizerSummarizeOptions = {}): Promise<number> => {

  }
}

export default Summarizer
