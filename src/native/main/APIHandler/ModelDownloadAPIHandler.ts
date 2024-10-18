import BrowserIPC from '../BrowserIPC'
import {
  kModelDownloadAsset
} from '#Shared/NativeAPI/ModelDownloadIPC'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import {
  AIModelAsset
} from '#Shared/AIModelManifest'
import { throttle } from 'throttle-debounce'
import fs from 'fs-extra'
import path from 'path'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { withDir, withFile } from 'tmp-promise'
import config from '#Shared/Config'
import { importLlama } from '#R/Llama'

class ModelDownloadAPIHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kModelDownloadAsset, this.#handleDownloadAsset)
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  #handleDownloadAsset = async (channel: IPCInflightChannel) => {
    const asset = channel.payload.asset as AIModelAsset

    if (await fs.exists(AIModelFileSystem.getAssetPath(asset.id))) {
      return
    }

    let loadedSize = 0
    const reportProgress = throttle(1000, () => {
      channel.emit({ assetId: asset.id, loaded: loadedSize, total: asset.size })
    })

    if (config.native.useModelDownloader) {
      await withDir(async (tmp) => {
        const { createModelDownloader } = await importLlama()
        let lastDownloadedSize = 0
        const downloader = await createModelDownloader({
          modelUri: asset.url,
          dirPath: tmp.path,
          onProgress: ({ downloadedSize }) => {
            const chunkSize = downloadedSize - lastDownloadedSize
            lastDownloadedSize = downloadedSize
            loadedSize += chunkSize
            reportProgress()
          }
        })
        const modelPath = await downloader.download()
        const assetPath = AIModelFileSystem.getAssetPath(asset.id)
        await fs.ensureDir(path.dirname(assetPath))
        await fs.move(modelPath, assetPath, { overwrite: true })
      })
    } else {
      await withFile(async (file) => {
        const res = await fetch(asset.url)
        if (!res.ok || !res.body) { throw new Error(`Failed to download ${asset.url}`) }

        const writer = fs.createWriteStream(file.path)
        const reader = Readable.fromWeb(res.body)
        reader.on('data', (chunk) => {
          loadedSize += chunk.length
          reportProgress()
        })
        await finished(reader.pipe(writer))
        const assetPath = AIModelFileSystem.getAssetPath(asset.id)
        await fs.ensureDir(path.dirname(assetPath))
        await fs.move(file.path, assetPath, { overwrite: true })
      })
    }

    reportProgress.cancel()
  }
}

export default ModelDownloadAPIHandler
