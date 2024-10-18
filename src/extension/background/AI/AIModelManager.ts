import { AIModelManifest } from '#Shared/AIModelManifest'
import semver from 'semver'
import AIModelDownload from './AIModelDownload'
import AIModelFileSystem from './AIModelFileSystem'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import {
  getModelUpdatePeriod,
  ModelUpdateMillis
} from '#Shared/Prefs'

type Task = () => Promise<any>

type DownloadProgressFn = (modelId: string, loaded: number, total: number) => void

class AIModelManager {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #tasks: Task[] = []
  #taskInflight = false

  /* **************************************************************************/
  // MARK: Task queue
  /* **************************************************************************/

  /**
   * Adds a task to the queue and immediately tries to dequeue the next task
   * @param task
   */
  #queueTask (task: Task): Promise<any> {
    return new Promise((resolve, reject) => {
      this.#tasks.push(async () => {
        try {
          resolve(await task())
        } catch (ex) {
          reject(ex)
        }
      })

      setTimeout(() => {
        this.#dequeueNextTask()
      }, 1)
    })
  }

  /**
   * Takes the next task off the queue and processes it
   * @returns
   */
  async #dequeueNextTask () {
    if (this.#taskInflight) { return }
    if (this.#tasks.length === 0) { return }

    try {
      this.#taskInflight = true
      const task = this.#tasks.shift()
      await task()
    } finally {
      this.#taskInflight = false
      setTimeout(() => {
        this.#dequeueNextTask()
      }, 1)
    }
  }

  /**
   * Installs a model with a provided manifest
   * @param manifest: the models manifest
   * @param progressFn: the progress callback
   */
  async #installManifest (manifest: AIModelManifest, progressFn?: DownloadProgressFn) {
    // Prep a progress reporting function
    const reportProgress = () => {
      if (progressFn) {
        let loaded = 0
        let total = 0
        for (const item of Object.values(progress)) {
          loaded += item.loaded
          total += item.size
        }
        progressFn(manifest.id, loaded, total)
      }
    }
    const progress: { [key: string]: { size: number, loaded: number }} = manifest.assets.reduce((acc, asset) => {
      acc[asset.id] = { size: asset.size, loaded: 0 }
      return acc
    }, {})

    // Download the assets
    reportProgress()
    for (const asset of manifest.assets) {
      await AIModelDownload.downloadAsset(asset, (assetId, loaded) => {
        progress[assetId].loaded = loaded
        reportProgress()
      })
      progress[asset.id].loaded = asset.size
    }

    // Write the model manifest
    await AIModelFileSystem.writeModelManifest(manifest)
    await AIModelFileSystem.updateModelStats(manifest.id, { updateTS: Date.now() })
  }

  /* **************************************************************************/
  // MARK: Model install lifecycle
  /* **************************************************************************/

  /**
   * Downloads and installs a model
   * @param channel: the channel the request came from
   * @param modelId: the id of the model to download
   * @param progressFn: the progress callback
   */
  install (channel: IPCInflightChannel, modelId: string, progressFn?: DownloadProgressFn) {
    const origin = channel.origin
    return this.#queueTask(async () => {
      console.log(`Installing model ${modelId}`)
      const manifest = await AIModelDownload.fetchModelManifest(modelId, origin)
      await this.#installManifest(manifest, progressFn)
    })
  }

  /**
   * Uninstalls a model
   * @param modelId: the id of the model
   */
  uninstall (modelId: string) {
    return this.#queueTask(async () => {
      console.log(`Uninstalling model ${modelId}`)
      await AIModelFileSystem.removeModelRepo(modelId)
      await AIModelFileSystem.removeUnusedAssets()
    })
  }

  /**
   * Updates an already installed model
   * @param channel: the channel the request came from
   * @param modelId: the id of the model to update
   * @param force=false: set to true to always check for updates, irregardless of the last check
   * @return true if an update check was made, false if no update was needed or it failed
   */
  update (channel: IPCInflightChannel, modelId: string, force = false): Promise<boolean> {
    const origin = channel.origin
    return this.#queueTask(async (): Promise<boolean> => {
      try {
        console.log(`Updating model ${modelId}`)

        if (!await AIModelFileSystem.hasModelInstalled(modelId)) {
          throw new Error(`Model ${modelId} not installed`)
        }

        const shouldCheck = force || (
          (Date.now() - ((await AIModelFileSystem.readModelStats(modelId)).updateTS ?? 0)) >
          ModelUpdateMillis[await getModelUpdatePeriod()]
        )

        if (shouldCheck) {
          console.log(`Model update check needed ${modelId}`)
          const remoteManifest = await AIModelDownload.fetchModelManifest(modelId, origin)
          const localManifest = await AIModelFileSystem.readModelManifest(modelId)
          await AIModelFileSystem.updateModelStats(modelId, { updateTS: Date.now() })

          if (semver.gt(remoteManifest.version, localManifest.version)) {
            console.log(`Model updating ${modelId}`)
            await this.#installManifest(remoteManifest)
            await AIModelFileSystem.removeUnusedAssets()
          }

          return true
        } else {
          console.log(`Model update not needed ${modelId}`)
          return false
        }
      } catch (ex) {
        console.error(`Model update failed ${modelId}: ${ex.message}`)
        return false
      }
    })
  }
}

export default new AIModelManager()
