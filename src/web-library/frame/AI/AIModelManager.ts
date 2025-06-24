import { AIModelManifest, AIModelFormat, updateManifestToV2 } from '#Shared/AIModelManifest'
import AIModelId, { AIModelIdProvider } from '#Shared/AIModelId'
import config from '#Shared/Config'
import { kModelIdProviderUnsupported } from '#Shared/Errors'
import { env as transformerEnv } from '@huggingface/transformers'
import AIAssetCache from './AIAssetCache'

class AIModelManager {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #manifestCache = new Map<string, AIModelManifest>()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    transformerEnv.useBrowserCache = false
    transformerEnv.useCustomCache = true
    transformerEnv.customCache = AIAssetCache
  }

  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  /**
   * Fetches the model manifest from the server
   * @param modelId: the id of the model
   * @returns the model manifest or false if it's not available
   */
  async fetchModelManifest (modelId: AIModelId): Promise<AIModelManifest> {
    if (!this.#manifestCache.has(modelId.toString())) {
      switch (modelId.provider) {
        case AIModelIdProvider.AiBrow: {
          const qs = new URLSearchParams({ version: config.version })
          const manifestUrl = `https://aibrow.ai/api/model/${modelId.toString()}/manifest.json?${qs.toString()}`

          const res = await fetch(manifestUrl)
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error(`No model found with id ${modelId}`)
            } else {
              throw new Error(`Network error ${res.status}`)
            }
          }

          const manifest: AIModelManifest = await res.json()
          this.#manifestCache.set(modelId.toString(), updateManifestToV2(manifest))
          break
        }
        default:
          throw new Error(kModelIdProviderUnsupported)
      }
    }

    return this.#manifestCache.get(modelId.toString())
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * Checks if all manifest assets are cached
   * @param manifest: the model manifest
   * @returns true if all assets are cached, false otherwise
   */
  async areManifestAssetsCached (manifest: AIModelManifest) {
    for (const asset of manifest.formats[AIModelFormat.ONNX].assets) {
      if (!await AIAssetCache.has(asset.url)) {
        return false
      }
    }

    return true
  }
}

export default new AIModelManager()
