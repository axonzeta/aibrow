import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  RewriterCreateOptions,
  RewriterWriteOptions
} from './RewriterTypes'

export class Rewriter extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: RewriterCreateOptions = {}): Promise<Rewriter> {

  }

  static async availability (options: RewriterCreateOptions = {}): Promise<AIModelAvailability> {

  }

  static async compatibility (options: RewriterCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {

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

  get tone () { }

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

  rewrite = async (input: string, options: RewriterWriteOptions = {}): Promise<string> => {

  }

  rewriteStreaming = async (input: string, options: RewriterWriteOptions = {}): Promise<ReadableStream> => {

  }

  measureInputUsage = async (input: string, options: RewriterWriteOptions = {}): Promise<number> => {

  }
}

export default Rewriter
