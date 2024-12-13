import AibrowAI from './AibrowAI'
import BrowserAI from './BrowserAI'
import WebAI from './WebAI'

class AI {
  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get web () { return WebAI }

  get browser () { return BrowserAI }

  get aibrow () { return AibrowAI }

  //todo current platform support
}

export default new AI()
