/* **************************************************************************/
// MARK: Assets
/* **************************************************************************/

export type AIModelAssetId = string

export type AIModelAsset = {
  id: AIModelAssetId
  size: number
  url: string
  parts?: number
}

/* **************************************************************************/
// MARK: Config
/* **************************************************************************/

export type AIModelManifestConfigRange = [number, number, number] // [min, default, max]

export type AIModelManifestConfig = {
  topK: AIModelManifestConfigRange
  topP: AIModelManifestConfigRange
  temperature: AIModelManifestConfigRange
  repeatPenalty: AIModelManifestConfigRange
  flashAttention: boolean
}

export type AIModelPromptConfig = {
  template: string
}

/* **************************************************************************/
// MARK: Formats
/* **************************************************************************/

export enum AIModelFormat {
  GGUF = 'gguf',
  ONNX = 'onnx'
}

export type AIModelFormatBase = {
  licenseUrl: string
  assets: AIModelAsset[]
}

export type AIModelFormatGGUF = {
  model: AIModelAssetId
  adapter?: AIModelAssetId
} & AIModelFormatBase

export type AIModelFormatONNX = {
  tokenizer: AIModelAssetId
  tokenizerConfig: AIModelAssetId
  dtype: 'auto' | 'fp32' | 'fp16' | 'q8' | 'int8' | 'uint8' | 'q4' | 'bnb4' | 'q4f16'
} & AIModelFormatBase

/* **************************************************************************/
// MARK: Manifest
/* **************************************************************************/

export type AIModelManifest = {
  id: string
  name: string
  version: string
  manifestVersion: number
  config: AIModelManifestConfig
  tokens: {
    max: number
    default: number
    stop?: string[]
    bosToken?: string
    eosToken?: string
  }
  prompts?: {
    languageModel?: AIModelPromptConfig
    languageDetector?: AIModelPromptConfig
    translator?: AIModelPromptConfig
    summarizer?: AIModelPromptConfig
    rewriter?: AIModelPromptConfig
    writer?: AIModelPromptConfig
  }
  generated?: {
    ts: number
    version: string
  }
  formats: {
    [AIModelFormat.GGUF]?: AIModelFormatGGUF
    [AIModelFormat.ONNX]?: AIModelFormatONNX
  }
}

/* **************************************************************************/
// MARK: Stats
/* **************************************************************************/

export type AIModelStats = {
  id: string,
  usedTS?: number
  updateTS?: number
  machineScore?: number
}

/* **************************************************************************/
// MARK: Utils
/* **************************************************************************/

/**
 * Updates the manifest the the latest version
 * @param manifest: the manifest to update
 * @return the updated manifest
 */
export function updateManifestToV2 (manifest: any) {
  //TODO: remove once the models on the server update this
  if (manifest.manifestVersion === 2) {
    return manifest
  }

  const { model, licenseUrl, assets, adapter, ...rest } = manifest
  return {
    ...rest,
    manifestVersion: 2,
    formats: {
      [AIModelFormat.GGUF]: {
        model,
        licenseUrl,
        assets,
        adapter
      }
    }
  }
}

/**
 * Gets the size of assets in the manifest
 * @param manifest: the manifest
 * @Param format: the format to get the size of
 * @returns the size of all assets
 */
export function getModelSize (manifest: AIModelManifest, format: AIModelFormat) {
  if (!manifest.formats[format]) {
    return 0
  }
  return manifest.formats[format].assets.reduce((acc, asset) => {
    return acc + asset.size
  }, 0)
}
