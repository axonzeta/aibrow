import { AIModelManifest } from '#Shared/AIModelManifest'
import semver from 'semver'
import AIModelDownload from './AIModelDownload'
import AIModelFileSystem from './AIModelFileSystem'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import {
  getModelUpdatePeriod,
  ModelUpdateMillis
} from '#Shared/Prefs'
import { nanoid } from 'nanoid'
import { EventEmitter } from 'events'

export enum TaskType {
  Install = 'install',
  Uninstall = 'uninstall',
  Update = 'update'
}

type TaskExecutor = (taskId: string) => Promise<any>

type Task = [TaskType, TaskExecutor]

type InflightTask = {
  id: string
  type: TaskType
  progress: number | null
  state: any
}

export type InflightTaskProgressEvent = {
  running: boolean
  type?: TaskType
  progress: number | null
  state: any
}

type DownloadProgressFn = (modelId: string, loaded: number, total: number) => void

class AIModelManagerImpl extends EventEmitter {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #tasks: Task[] = []
  #taskInflight: InflightTask | undefined

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get inflightTask () {
    return {
      running: Boolean(this.#taskInflight),
      type: this.#taskInflight?.type ?? undefined,
      progress: this.#taskInflight?.progress ?? null,
      state: this.#taskInflight?.state ?? null
    } as InflightTaskProgressEvent
  }

  /* **************************************************************************/
  // MARK: Task queue
  /* **************************************************************************/

  /**
   * Adds a task to the queue and immediately tries to dequeue the next task
   * @param task
   */
  #queueTask (type: TaskType, task: TaskExecutor): Promise<any> {
    return new Promise((resolve, reject) => {
      this.#tasks.push([type, async (taskId: string) => {
        try {
          resolve(await task(taskId))
        } catch (ex) {
          reject(ex)
        }
      }])

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
      const taskId = nanoid()
      this.#emitTaskChangedEvent()
      const [type, taskExec] = this.#tasks.shift()
      this.#taskInflight = {
        id: taskId,
        type,
        progress: null,
        state: null
      }
      await taskExec(taskId)
    } finally {
      this.#taskInflight = undefined
      this.#emitTaskChangedEvent()
      setTimeout(() => {
        this.#dequeueNextTask()
      }, 1)
    }
  }

  /**
   * Updates the state of a task
   * @param taskId: the id of the task
   * @param state: the current state
   */
  #updateTaskState (taskId: string, state: any) {
    if (this.#taskInflight.id === taskId) {
      this.#taskInflight.state = state
      this.#emitTaskChangedEvent()
    }
  }

  /**
   * Updates the progress of a task
   * @param taskId: the id of the task
   * @param progress: the new progress
   */
  #updateTaskProgress (taskId: string, progress: number | null) {
    if (this.#taskInflight.id === taskId) {
      this.#taskInflight.progress = progress
      this.#emitTaskChangedEvent()
    }
  }

  /**
   * Emits a task changed event
   */
  #emitTaskChangedEvent () {
    this.emit('task-changed', {
      running: Boolean(this.#taskInflight),
      type: this.#taskInflight?.type ?? undefined,
      progress: this.#taskInflight?.progress ?? null,
      state: this.#taskInflight?.state ?? null
    } as InflightTaskProgressEvent)
  }

  /* **************************************************************************/
  // MARK: Model install lifecycle
  /* **************************************************************************/

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

  /**
   * Downloads and installs a model
   * @param channel: the channel the request came from
   * @param modelId: the id of the model to download
   * @param progressFn: the progress callback
   */
  install (channel: IPCInflightChannel, modelId: string, progressFn?: DownloadProgressFn) {
    return this.#queueTask(TaskType.Install, async (taskId: string) => {
      console.log(`Installing model ${modelId}`)
      const manifest = await AIModelDownload.fetchModelManifest(modelId)
      this.#updateTaskState(taskId, { id: manifest.id, name: manifest.name })
      await this.#installManifest(manifest, (modelId, loaded, total) => {
        this.#updateTaskProgress(taskId, Math.round((loaded / total) * 100))
        if (progressFn) {
          progressFn(modelId, loaded, total)
        }
      })
    })
  }

  /**
   * Uninstalls a model
   * @param modelId: the id of the model
   */
  uninstall (modelId: string) {
    return this.#queueTask(TaskType.Uninstall, async () => {
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
    return this.#queueTask(TaskType.Update, async (): Promise<boolean> => {
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
          const remoteManifest = await AIModelDownload.fetchModelManifest(modelId)
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

export const AIModelManager = new AIModelManagerImpl()
export default AIModelManager
