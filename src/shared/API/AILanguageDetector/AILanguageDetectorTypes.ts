import {
  AIRootCapabilitiesOptions,
  AIRootModelCapabilitiesData,
  AIRootCreateOptions,
  AIRootModelProps,
  AIRootModelData,
  AIRootCloneOptions
} from '../AI'

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

export type AILanguageDetectorCapabilitiesOptions = AIRootCapabilitiesOptions

export type AILanguageDetectorCapabilitiesData = AIRootModelCapabilitiesData

/* **************************************************************************/
// MARK: Clone
/* **************************************************************************/

export type AILanguageDetectorCloneOptions = AIRootCloneOptions

/* **************************************************************************/
// MARK: LanguageDetector
/* **************************************************************************/

type LanguageDetectorProps = object

export type AILanguageDetectorProps = LanguageDetectorProps & AIRootModelProps

export type AILanguageDetectorCreateOptions = AIRootCreateOptions & Partial<LanguageDetectorProps>

export type AILanguageDetectorData = {
  props: AILanguageDetectorProps
} & AIRootModelData

export type AILanguageDetectorDetectOptions = {
  signal?: AbortSignal
}

export type AILanguageDetectorDetectResult = {
  detectedLanguage: string
  confidence: number
}

export const AILanguageDetectorDefaultLanguages = [
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
