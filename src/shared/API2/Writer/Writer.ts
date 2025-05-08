import {
  AIModelAvailability,
  AIModelCoreCompatibility,
  AICoreModel
} from '../AICoreTypes'
import {
  WriterCreateOptions,
  WriterWriteOptions
} from './WriterTypes'

export class Writer extends EventTarget implements AICoreModel {
  /* **************************************************************************/
  // MARK: Static
  /* **************************************************************************/

  static async create (options: WriterCreateOptions = {}): Promise<Writer> {

  }

  static async availability (options: WriterCreateOptions = {}): Promise<AIModelAvailability> {

  }

  static async compatibility (options: WriterCreateOptions = {}): Promise<AIModelCoreCompatibility | null> {

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

  write = async (input: string, options: WriterWriteOptions = {}): Promise<string> => {

  }

  writeStreaming = async (input: string, options: WriterWriteOptions = {}): Promise<ReadableStream> => {

  }

  measureInputUsage = async (input: string, options: WriterWriteOptions = {}): Promise<number> => {

  }
}

export default Writer
