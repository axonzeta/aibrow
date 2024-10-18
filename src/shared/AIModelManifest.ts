/* **************************************************************************/
// MARK: Types
/* **************************************************************************/

export enum AIModelTokenCountMethod {
  Divide4 = 'divide4'
}

export type AIModelAssetId = string

export type AIModelAsset = {
  id: AIModelAssetId
  size: number
  url: string
}

export type AIModelManifestConfig = {
  defaultTopK: number
  maxTopK: number
  defaultTemperature: number
  maxTemperature: number
}

export type AIModelPromptConfig = {
  template: string
  bosToken?: string
  eosToken?: string
}

export type AIModelManifest = {
  id: string
  name: string
  version: string
  model: AIModelAssetId
  config: AIModelManifestConfig
  licenseUrl: string
  tokens: {
    max: number
    method: AIModelTokenCountMethod[] | AIModelTokenCountMethod
  }
  prompts?: {
    languageModel?: AIModelPromptConfig
    summarizer?: AIModelPromptConfig
    rewriter?: AIModelPromptConfig
    writer?: AIModelPromptConfig
  }
  assets: AIModelAsset[]
  adapter: AIModelAssetId
}

export type AIModelStats = {
  id: string,
  usedTS?: number
  updateTS?: number
}

/* **************************************************************************/
// MARK: Utils
/* **************************************************************************/

/**
 * Gets the size of assets in the manifest
 * @param manifest: the manifest
 * @returns the size of all assets
 */
export function getModelSize (manifest: AIModelManifest) {
  return manifest.assets.reduce((acc, asset) => {
    return acc + asset.size
  }, 0)
}
