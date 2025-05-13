import IPCRegistrar from '#Shared/API/IPCRegistrar'
import IPC from './IPC'
import Embedding from '#Shared/API/Embedding/Embedding'
import LanguageModel from '#Shared/API/LanguageModel/LanguageModel'
import Rewriter from '#Shared/API/Rewriter/Rewriter'
import Summarizer from '#Shared/API/Summarizer/Summarizer'
import Writer from '#Shared/API/Writer/Writer'

class AIBrowWeb {
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

  LanguageModel = LanguageModel

  Rewriter = Rewriter

  Summarizer = Summarizer

  Writer = Writer
}

export default new AIBrowWeb()
