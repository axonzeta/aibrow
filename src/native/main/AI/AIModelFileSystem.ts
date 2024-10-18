import fs from 'fs-extra'
import path from 'path'
import * as Paths from '../Paths'
import sanitizeFilename from 'sanitize-filename'
import {
  AIModelManifest,
  AIModelAssetId,
  AIModelStats
} from '#Shared/AIModelManifest'
import lockfile from 'proper-lockfile'
import { withFile } from 'tmp-promise'
import Logger from '#R/Logger'

class AIModelFileSystem {
  /* **************************************************************************/
  // MARK: Repo
  /* **************************************************************************/

  /**
   * @param modelId: the model id
   * @returns the path to the local model
   */
  getModelRepoPath (modelId: string) {
    return path.join(Paths.models, sanitizeFilename(modelId))
  }

  /**
   * Removes a model from disk
   * @param modelId: the id of the model
   */
  async removeModelRepo (modelId: string) {
    await fs.remove(this.getModelRepoPath(modelId))
  }

  /* **************************************************************************/
  // MARK: Model
  /* **************************************************************************/

  /**
   * Checks if there is a local model
   * @param id: the model id
   * @returns true if there's a local model on path, false otherwise
   */
  async hasModel (modelId: string) {
    try {
      await this.readModelManifest(modelId)
      return true
    } catch (ex) {
      return false
    }
  }

  /**
   * Gets a list of local models
   * @param stats: whether to include stats
   * @return an array of model manifests
   */
  async getModels (stats = false) {
    const models: Array<{ manifest: AIModelManifest, stats: AIModelStats } | AIModelManifest> = []
    try {
      for (const modelDir of await fs.readdir(Paths.models)) {
        try {
          const manifest = await this.readModelManifest(modelDir)
          if (stats) {
            models.push({ manifest, stats: await this.readModelStats(modelDir) })
          } else {
            models.push(manifest)
          }
        } catch (ex) { /* no-op */ }
      }
    } catch (ex) { /* no-op */ }
    return models
  }

  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  /**
   * @param modelId: the model id
   * @returns the models manifest path
   */
  getModelManifestPath (modelId: string) {
    return path.join(this.getModelRepoPath(modelId), 'manifest.json')
  }

  /**
   * @param modelId: the model id
   * @returns the models manifest
   */
  async readModelManifest (modelId: string) {
    const manifest = await fs.readJSON(this.getModelManifestPath(modelId))
    return manifest as AIModelManifest
  }

  /**
   * Writes the manifest to disk
   * @param manifest: the manifest
   */
  async writeModelManifest (manifest: AIModelManifest) {
    await withFile(async (file) => {
      const manifestPath = this.getModelManifestPath(manifest.id)
      await fs.writeJSON(file.path, manifest, { spaces: 2 })
      await fs.ensureDir(path.dirname(manifestPath))
      await fs.move(file.path, manifestPath, { overwrite: true })
    })
  }

  /* **************************************************************************/
  // MARK: Stats
  /* **************************************************************************/

  /**
   * Marks a model as used by writing a timestamp
   * @param id
   */
  async markModelUsed (modelId: string) {
    await this.updateModelStats(modelId, { usedTS: Date.now() })
  }

  /**
   * Updates the model stats
   * @param modelId: the model id
   * @param delta: the stats to update
   * @returns the model stats
   */
  async updateModelStats (modelId: string, delta: Partial<AIModelStats>) {
    const repoPath = this.getModelRepoPath(modelId)
    const statsPath = path.join(repoPath, 'stats.json')

    let release: any
    try {
      release = await lockfile.lock(statsPath)
    } catch (ex) {
      if (ex.message.startsWith('ENOENT')) {
        fs.writeJSONSync(statsPath, { id: modelId })
        release = await lockfile.lock(statsPath)
      } else {
        throw ex
      }
    }

    const stats = await fs.readJSON(statsPath, { throws: false })
    await fs.writeJSON(statsPath, { ...stats, ...delta, id: modelId })
    await release()
  }

  /**
   * Loads the model stats
   * @param modelId: the model id
   * @returns the model stats
   */
  async readModelStats (modelId: string) {
    const repoPath = this.getModelRepoPath(modelId)
    const stats = await fs.readJSON(path.join(repoPath, 'stats.json'), { throws: false }) ?? { id: modelId }
    return stats as AIModelStats
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * @param assetId: the asset id
   * @returns the path to the local asset
   */
  getAssetPath (assetId: AIModelAssetId) {
    return path.join(Paths.assets, sanitizeFilename(assetId))
  }

  /**
   * Removes all unused assets
   */
  async removeUnusedAssets () {
    const usedAssetIds = new Set()
    for (const manifest of await this.getModels(false)) {
      for (const asset of (manifest as AIModelManifest).assets) {
        usedAssetIds.add(asset.id)
      }
    }

    for (const assetId of await fs.readdir(Paths.assets)) {
      if (!usedAssetIds.has(assetId)) {
        Logger.log(`Removing asset ${assetId}`)
        await fs.remove(this.getAssetPath(assetId))
      }
    }
  }

  /* **************************************************************************/
  // MARK: LLM
  /* **************************************************************************/

  /**
   * Gets the path to the local model
   * @param modelId: the model id
   * @returns the path to the local model
   */
  async getLLMPath (modelId: string) {
    const manifest = await this.readModelManifest(modelId)
    return this.getAssetPath(manifest.model)
  }
}

export default new AIModelFileSystem()
