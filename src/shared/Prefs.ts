import config from './Config'
import { AIModelType } from './API/AICoreTypes'

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

const kDefaultModelsPrefixKey = `${kPrefKeyPrefix}:defaultModels:`
export async function getDefaultModel (modelType: AIModelType) { return getPref(`${kDefaultModelsPrefixKey}${modelType}`, config.defaultModels[modelType]) }
export async function setDefaultModel (modelType: AIModelType, modelId: string) { return setPref(`${kDefaultModelsPrefixKey}${modelType}`, modelId) }

const kOverrideBrowserAIKey = `${kPrefKeyPrefix}:overrideBrowserAI`
const kContentscriptMainOverrideId = 'contentscript-main-override'
export async function getOverrideBrowserAI () { return getPref(kOverrideBrowserAIKey, false) }
export async function setOverrideBrowserAI (override: boolean) {
  await updateOverrideBrowserAIScriptInjection(override)
  await setPref(kOverrideBrowserAIKey, override)
}
export async function updateOverrideBrowserAIScriptInjection (override: boolean) {
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [kContentscriptMainOverrideId] })
  if (override) {
    if (scripts.length === 0) {
      await chrome.scripting.registerContentScripts([{
        id: kContentscriptMainOverrideId,
        js: ['contentscript-main-override.js'],
        allFrames: true,
        runAt: 'document_start',
        world: 'MAIN',
        matches: ['<all_urls>']
      }])
    }
  } else {
    if (scripts.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [kContentscriptMainOverrideId] })
    }
  }
}

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
