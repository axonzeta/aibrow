import fs from 'fs-extra'
import path from 'path'
import * as Paths from '../Paths'
import sanitizeFilename from 'sanitize-filename'
import {
  AIModelManifest,
  AIModelAssetId,
  AIModelStats,
  updateManifestToV2,
  AIModelFormat
} from '#Shared/AIModelManifest'
import lockfile from 'proper-lockfile'
import { withFile } from 'tmp-promise'
import Logger from '#R/Logger'
import AIModelId from '#Shared/AIModelId'
import klaw from 'klaw'
import normalizePath from 'normalize-path'

const kManifestFilename = 'manifest.json'
const kStatsFilename = 'stats.json'

class AIModelFileSystem {
  /* **************************************************************************/
  // MARK: Repo
  /* **************************************************************************/

  /**
   * @param modelId: the model id
   * @returns the path to the local model
   */
  getModelRepoPath (modelId: AIModelId) {
    return path.join(Paths.models, ...modelId.toPathComponents())
  }

  /**
   * Removes a model from disk
   * @param modelId: the id of the model
   */
  async removeModelRepo (modelId: AIModelId) {
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
  async hasModel (modelId: AIModelId) {
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
    const models: ({ manifest: AIModelManifest, stats: AIModelStats } | AIModelManifest)[] = []

    try {
      for await (const file of klaw(Paths.models)) {
        if (path.basename(file.path) === kManifestFilename) {
          try {
            const manifest = await fs.readJSON(file.path)
            const modelId = new AIModelId(manifest.id)
            if (normalizePath(this.getModelManifestPath(modelId)) === normalizePath(file.path)) {
              if (stats) {
                models.push({ manifest, stats: await this.readModelStats(modelId) })
              } else {
                models.push(manifest)
              }
            }
          } catch (ex) { /* no-op */ }
        }
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
  getModelManifestPath (modelId: AIModelId) {
    return path.join(this.getModelRepoPath(modelId), kManifestFilename)
  }

  /**
   * @param modelId: the model id
   * @returns the models manifest
   */
  async readModelManifest (modelId: AIModelId) {
    const manifest = updateManifestToV2(await fs.readJSON(this.getModelManifestPath(modelId)))
    return manifest as AIModelManifest
  }

  /**
   * Writes the manifest to disk
   * @param manifest: the manifest
   */
  async writeModelManifest (manifest: AIModelManifest) {
    await withFile(async (file) => {
      const manifestPath = this.getModelManifestPath(new AIModelId(manifest.id))
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
  async markModelUsed (modelId: AIModelId) {
    await this.updateModelStats(modelId, { usedTS: Date.now() })
  }

  /**
   * Updates the model stats
   * @param modelId: the model id
   * @param delta: the stats to update
   * @returns the model stats
   */
  async updateModelStats (modelId: AIModelId, delta: Partial<AIModelStats>) {
    const repoPath = this.getModelRepoPath(modelId)
    const statsPath = path.join(repoPath, kStatsFilename)

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
  async readModelStats (modelId: AIModelId) {
    const repoPath = this.getModelRepoPath(modelId)
    try {
      return await fs.readJSON(path.join(repoPath, kStatsFilename)) as AIModelStats
    } catch (ex) {
      return { id: modelId.toString() } as AIModelStats
    }
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * @param assetId: the asset id
   * @returns the path to the local asset
   */
  getAssetPath (assetId: AIModelAssetId) {
    return path.join(
      Paths.assets,
      ...assetId
        .split('/')
        .map((part) => sanitizeFilename(part))
        .filter(Boolean))
  }

  /**
   * Removes all unused assets
   */
  async removeUnusedAssets () {
    const usedAssetPaths = new Set<string>()
    for (const manifest of (await this.getModels(false)) as AIModelManifest[]) {
      for (const asset of manifest.formats[AIModelFormat.GGUF]?.assets ?? []) {
        usedAssetPaths.add(normalizePath(this.getAssetPath(asset.id)))
      }
    }

    for await (const file of klaw(Paths.assets)) {
      if (file.stats.isFile() && !usedAssetPaths.has(normalizePath(file.path))) {
        Logger.log(`Removing asset ${file.path}`)
        await fs.remove(file.path)
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
  async getLLMPath (modelId: AIModelId) {
    const manifest = await this.readModelManifest(modelId)
    if (!manifest.formats[AIModelFormat.GGUF]) { throw new Error('Model has no GGUF format') }
    return this.getAssetPath(manifest.formats[AIModelFormat.GGUF].model)
  }
}

export default new AIModelFileSystem()
