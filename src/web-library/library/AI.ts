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
}

export default new AI()
