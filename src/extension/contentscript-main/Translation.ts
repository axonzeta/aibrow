import AI from './AI'
import AILanguageDetector from './AILanguageDetector/AILanguageDetector'
import AITranslator from './AITranslator/AITranslator'

type DetectorBridge = {
  aiDetector?: AILanguageDetector
  readyResolvers: Array<(value: any) => void>
}

type TranslatorOptions = {
  sourceLanguage: string
  targetLanguage: string
}

/* **************************************************************************/
//
// MARK: ==Detector==
//
/* **************************************************************************/

class Detector extends EventTarget {
  #bridge: DetectorBridge

  constructor (bridge: DetectorBridge) {
    super()
    this.#bridge = bridge
  }

  get ready () {
    if (this.#bridge.aiDetector) {
      return Promise
    } else {
      return new Promise((resolve) => {
        this.#bridge.readyResolvers.push(resolve)
      })
    }
  }

  detect = async (input: string) => {
    await this.ready
    return this.#bridge.aiDetector.detect(input)
  }
}

/* **************************************************************************/
//
// MARK: ==Translator==
//
/* **************************************************************************/

class Translator {
  #aiTranslator: AITranslator

  constructor (aiTranslator: AITranslator) {
    this.#aiTranslator = aiTranslator
  }

  translate = async (input: string) => {
    return this.#aiTranslator.translate(input)
  }
}

/* **************************************************************************/
//
// MARK: ==Translation==
//
/* **************************************************************************/

class Translation {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #ai: AI
  #downloadProgressFn: (evt: Event) => void

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (ai: AI) {
    this.#ai = ai
  }

  /* **************************************************************************/
  // MARK: Detection
  /* **************************************************************************/

  canDetect = async () => {
    const capabilities = await this.#ai.languageDetector.capabilities()
    return capabilities.available
  }

  createDetector = async () => {
    const bridge: DetectorBridge = {
      readyResolvers: []
    }
    const detector = new Detector(bridge)

    this.#ai.languageDetector.create({
      monitor: (m: EventTarget) => {
        m.addEventListener('downloadprogress', (evt) => {
          detector.dispatchEvent(evt)
        })
      }
    }).then((aiDetector: AILanguageDetector) => {
      bridge.aiDetector = aiDetector
      const resolvers = bridge.readyResolvers
      bridge.readyResolvers = []
      resolvers.forEach((resolve) => { resolve(undefined) })
    })

    return detector
  }

  /* **************************************************************************/
  // MARK: Translation
  /* **************************************************************************/

  get downloadProgress () { return this.#downloadProgressFn }
  set downloadProgress (v) { this.#downloadProgressFn = v }

  canTranslate = async (opts: TranslatorOptions) => {
    const capabilities = await this.#ai.translator.capabilities()
    return capabilities.languagePairAvailable(opts.sourceLanguage, opts.targetLanguage)
  }

  createTranslator = async (opts: TranslatorOptions) => {
    return new Translator(await this.#ai.translator.create(opts))
  }
}

export default Translation