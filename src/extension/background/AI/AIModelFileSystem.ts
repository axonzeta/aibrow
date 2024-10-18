import { AIModelManifest, AIModelStats } from '#Shared/AIModelManifest'
import {
  kModelFileSystemReadModelManifest,
  kModelFileSystemWriteModelManifest,
  kModelFileSystemHasModelInstalled,
  kModelFileSystemRemoveModelRepo,
  kModelFileSystemGetInstalledModels,
  kModelFileSystemRemoveUnusedAssets,
  kModelFileSystemReadModelStats,
  kModelFileSystemUpdateModelStats
} from '#Shared/NativeAPI/ModelFileSystemIPC'
import NativeIPC from '../NativeIPC'

class AIModelFileSystem {
  /* **************************************************************************/
  // MARK: Models
  /* **************************************************************************/

  /**
   * Checks if the model manifest is available on disk
   * @param modelId: the id of the model
   * @returns true if it's available, false otherwise
   */
  async hasModelInstalled (modelId: string): Promise<AIModelManifest | false> {
    return await NativeIPC.request(kModelFileSystemHasModelInstalled, { modelId })
  }

  /**
   * Removes a model from disk
   * @param modelId: the id of the model
   */
  async removeModelRepo (modelId: string) {
    return await NativeIPC.request(kModelFileSystemRemoveModelRepo, { modelId })
  }

  /**
   * Gets a list of installed models
   * @param stats=false: true to include the stats info
   * @returns an array of installed models
   */
  async getInstalledModels (stats = false): Promise<Array<{ manifest: AIModelManifest, stats: AIModelStats } | AIModelManifest>> {
    return await NativeIPC.request(kModelFileSystemGetInstalledModels, { stats })
  }

  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  /**
   * Gets the model manifest from disk
   * @param modelId: the id of the model
   * @returns the model manifest or false if it's not available
   */
  async readModelManifest (modelId: string): Promise<AIModelManifest> {
    const manifest = (await NativeIPC.request(kModelFileSystemReadModelManifest, { modelId })) as AIModelManifest | false
    if (manifest === false) {
      throw new Error('Failed to read model manifest')
    }
    return manifest
  }

  /**
   * Writes a model manifest
   * @param manifest: the manifest json
   */
  async writeModelManifest (manifest: AIModelManifest) {
    return await NativeIPC.request(kModelFileSystemWriteModelManifest, { manifest })
  }

  /* **************************************************************************/
  // MARK: Model stats
  /* **************************************************************************/

  /**
   * Reads the models stats
   * @param modelId: the id of the model
   * @returns the model stats or an empty object
   */
  async readModelStats (modelId: string): Promise<AIModelStats> {
    return NativeIPC.request(kModelFileSystemReadModelStats, { modelId })
  }

  /**
   * Updates the models stats
   * @param modelId: the id of the model
   * @param update: the update to merge
   */
  async updateModelStats (modelId: string, update: Partial<AIModelStats>) {
    return NativeIPC.request(kModelFileSystemUpdateModelStats, { modelId, update })
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * Removes assets that are no longer referenced by installed models
   */
  async removeUnusedAssets () {
    return await NativeIPC.request(kModelFileSystemRemoveUnusedAssets, {})
  }
}

export default new AIModelFileSystem()
