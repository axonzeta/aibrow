import { AIModelAsset, AIModelManifest } from '#Shared/AIModelManifest'
import {
  kModelDownloadAsset
} from '#Shared/NativeAPI/ModelDownloadIPC'
import NativeIPC from '../NativeIPC'
import config from '#Shared/Config'

type DownloadProgressFn = (assetId: string, loaded: number, total: number) => void

class AIModelDownload {
  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  /**
   * Fetches the model manifest from the server
   * @param modelId: the id of the model
   * @returns the model manifest or false if it's not available
   */
  async fetchModelManifest (modelId: string): Promise<AIModelManifest> {
    const qs = new URLSearchParams({ version: config.version })
    const manifestUrl = `https://aibrow.ai/api/model/${modelId}/manifest.json?${qs.toString()}`
    const res = await fetch(manifestUrl)
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`No model found with id ${modelId}`)
      } else {
        throw new Error(`Network error ${res.status}`)
      }
    }

    const manifest: AIModelManifest = await res.json()
    return manifest
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * Downloads an asset
   * @param asset: the asset to download
   * @param progressFn: the progress function to report updates
   */
  async downloadAsset (asset: AIModelAsset, progressFn?: DownloadProgressFn) {
    return await NativeIPC.stream(
      kModelDownloadAsset,
      { asset },
      ({ loaded, total }) => progressFn?.(asset.id, loaded, total)
    )
  }
}

export default new AIModelDownload()
