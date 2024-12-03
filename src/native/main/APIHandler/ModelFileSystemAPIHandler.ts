import BrowserIPC from '../BrowserIPC'
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
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import AIModelId from '#Shared/AIModelId'

class ModelFileSystemAPIHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kModelFileSystemReadModelManifest, this.#handleReadModelManifest)
      .addRequestHandler(kModelFileSystemWriteModelManifest, this.#handleWriteModelManifest)
      .addRequestHandler(kModelFileSystemHasModelInstalled, this.#handleHasModelInstalled)
      .addRequestHandler(kModelFileSystemRemoveModelRepo, this.#handleRemoveModelRepo)
      .addRequestHandler(kModelFileSystemGetInstalledModels, this.#handleGetInstalledModels)
      .addRequestHandler(kModelFileSystemRemoveUnusedAssets, this.#handleRemoveUnusedAssets)
      .addRequestHandler(kModelFileSystemReadModelStats, this.#handleReadModelStats)
      .addRequestHandler(kModelFileSystemUpdateModelStats, this.#handleUpdateModelStats)
  }

  /* **************************************************************************/
  // MARK: Models
  /* **************************************************************************/

  #handleHasModelInstalled = async (channel: IPCInflightChannel) => {
    const modelId = new AIModelId(channel.payload.modelId)
    return await AIModelFileSystem.hasModel(modelId)
  }

  #handleRemoveModelRepo = async (channel: IPCInflightChannel) => {
    const modelId = new AIModelId(channel.payload.modelId)
    return await AIModelFileSystem.removeModelRepo(modelId)
  }

  #handleGetInstalledModels = async (channel: IPCInflightChannel) => {
    return await AIModelFileSystem.getModels(channel.payload.stats === true)
  }

  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  #handleReadModelManifest = async (channel: IPCInflightChannel) => {
    try {
      const modelId = new AIModelId(channel.payload.modelId)
      return await AIModelFileSystem.readModelManifest(modelId)
    } catch (ex) {
      return false
    }
  }

  #handleWriteModelManifest = async (channel: IPCInflightChannel) => {
    return await AIModelFileSystem.writeModelManifest(channel.payload.manifest)
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  #handleRemoveUnusedAssets = async () => {
    await AIModelFileSystem.removeUnusedAssets()
  }

  /* **************************************************************************/
  // MARK: Stats
  /* **************************************************************************/

  #handleReadModelStats = async (channel: IPCInflightChannel) => {
    const modelId = new AIModelId(channel.payload.modelId)
    return AIModelFileSystem.readModelStats(modelId)
  }

  #handleUpdateModelStats = async (channel: IPCInflightChannel) => {
    const modelId = new AIModelId(channel.payload.modelId)
    return AIModelFileSystem.updateModelStats(modelId, channel.payload.update)
  }
}

export default ModelFileSystemAPIHandler
