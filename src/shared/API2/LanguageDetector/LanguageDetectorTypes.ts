import {
  AIModelCoreCreateOptions,
  AIModelCoreState
} from '../AICoreTypes'

/* **************************************************************************/
// MARK: Creation
/* **************************************************************************/

export type LanguageDetectorCreateOptions = AIModelCoreCreateOptions & {
  expectedInputLanguages?: string[]
}

/* **************************************************************************/
// MARK: Detector
/* **************************************************************************/

export type LanguageDetectorDetectOptions = {
  signal?: AbortSignal
}

export type LanguageDetectorDetectionResult = {
  detectedLanguage: string
  confidence: number
}

/* **************************************************************************/
// MARK: State
/* **************************************************************************/

export type LanguageDetectorState = AIModelCoreState & {
  expectedInputLanguages?: string[]
  inputQuota: number
}

/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export const LanguageDetectorDefaultLanguages = [
  'af',
  'am',
  'ar',
  'ar-Latn',
  'az',
  'be',
  'bg',
  'bg-Latn',
  'bn',
  'bs',
  'ca',
  'ceb',
  'co',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'el-Latn',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fil',
  'fr',
  'fy',
  'ga',
  'gd',
  'gl',
  'gu',
  'ha',
  'haw',
  'hi',
  'hi-Latn',
  'hmn',
  'hr',
  'ht',
  'hu',
  'hy',
  'id',
  'ig',
  'is',
  'it',
  'iw',
  'ja',
  'ja-Latn',
  'jv',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'ku',
  'ky',
  'la',
  'lb',
  'lo',
  'lt',
  'lv',
  'mg',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'ne',
  'nl',
  'no',
  'ny',
  'pa',
  'pl',
  'ps',
  'pt',
  'ro',
  'ru',
  'ru-Latn',
  'sd',
  'si',
  'sk',
  'sl',
  'sm',
  'sn',
  'so',
  'sq',
  'sr',
  'st',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'tr',
  'uk',
  'ur',
  'uz',
  'vi',
  'xh',
  'yi',
  'yo',
  'zh',
  'zh-Latn',
  'zu'
]
