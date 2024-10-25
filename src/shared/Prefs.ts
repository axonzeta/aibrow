import Config from './Config'

/* **************************************************************************/
// MARK: Base
/* **************************************************************************/

const kPrefKeyPrefix = 'pref::'

export async function setPref (key: string, value: any) {
  if (value === undefined) {
    await chrome.storage.local.remove(`${kPrefKeyPrefix}${key}`)
  } else {
    await chrome.storage.local.set({ [`${kPrefKeyPrefix}${key}`]: value })
  }
}

export async function getPref (key: string, defaultValue: any) {
  const storageKey = `${kPrefKeyPrefix}${key}`
  const res = await chrome.storage.local.get(storageKey)
  return res[storageKey] ?? defaultValue
}

export async function getEnumPref (key: string, options: { [key: string]: any}, defaultValue: any) {
  const value = await getPref(key, defaultValue)
  return Object.values(options).includes(value) ? value : defaultValue
}

/* **************************************************************************/
// MARK: Updates
/* **************************************************************************/

const kLastUpdateTimeKey = 'lastUpdateTime'

export async function getLastUpdateTime () { return getPref(kLastUpdateTimeKey, 0) }
export async function setLastUpdateTime (time: number = Date.now()) { return setPref(kLastUpdateTimeKey, time) }

/* **************************************************************************/
// MARK: Models
/* **************************************************************************/

const kDefaultModelKey = `${kPrefKeyPrefix}:defaultModel`
export async function getDefaultModel () { return getPref(kDefaultModelKey, Config.defaultAiModel) }
export async function setDefaultModel (modelId: string) { return setPref(kDefaultModelKey, modelId) }

const kDefaultUseBrowserAIKey = `${kPrefKeyPrefix}:useBrowserAI`
export async function getUseBrowserAI () { return getPref(kDefaultUseBrowserAIKey, false) }
export async function setUseBrowserAI (use: boolean) { return setPref(kDefaultUseBrowserAIKey, use) }

const kDefaultModelEngineKey = `${kPrefKeyPrefix}:defaultModelEngine`
export async function getDefaultModelEngine () { return getPref(kDefaultModelEngineKey, undefined) }
export async function setDefaultModelEngine (engine: string) { return setPref(kDefaultModelEngineKey, engine) }

const kModelUpdatePeriodKey = `${kPrefKeyPrefix}:modelUpdatePeriod`
export enum ModelUpdatePeriod {
  Before = 'before',
  Hourly = 'hourly',
  Daily = 'daily',
  Weekly = 'weekly',
}
export const ModelUpdateMillis = {
  [ModelUpdatePeriod.Before]: 0,
  [ModelUpdatePeriod.Hourly]: 3600 * 1000,
  [ModelUpdatePeriod.Daily]: 24 * 3600 * 1000,
  [ModelUpdatePeriod.Weekly]: 7 * 24 * 3600 * 1000
}
export async function getModelUpdatePeriod () { return getEnumPref(kModelUpdatePeriodKey, ModelUpdatePeriod, ModelUpdatePeriod.Daily) }
export async function setModelUpdatePeriod (period: ModelUpdatePeriod) { return setPref(kModelUpdatePeriodKey, period) }

/* **************************************************************************/
// MARK: Prompting
/* **************************************************************************/

const kUseMmapKey = `${kPrefKeyPrefix}:useMmap`
export async function getUseMmap () { return getPref(kUseMmapKey, true) }
export async function setUseMmap (use: boolean) { return setPref(kUseMmapKey, use) }
