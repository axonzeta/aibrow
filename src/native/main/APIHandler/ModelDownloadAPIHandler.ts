import BrowserIPC from '../BrowserIPC'
import {
  kModelDownloadAsset,
  kModelFetchManifestHuggingFace
} from '#Shared/NativeAPI/ModelDownloadIPC'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import {
  AIModelAsset,
  AIModelManifest,
  AIModelFormat
} from '#Shared/AIModelManifest'
import { throttle } from 'throttle-debounce'
import fs from 'fs-extra'
import path from 'path'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import { withDir, withFile } from 'tmp-promise'
import config from '#Shared/Config'
import { importLlama } from '#R/Llama'
import { getNonEmptyString } from '#Shared/Typo/TypoParser'
import AIModelId, { AIModelIdProvider } from '#Shared/AIModelId'
import AIModelAssetId from '#Shared/AIModelAssetId'

class ModelDownloadAPIHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kModelDownloadAsset, this.#handleDownloadAsset)
      .addRequestHandler(kModelFetchManifestHuggingFace, this.#handleFetchManifestHuggingFace)
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  #handleDownloadAsset = async (channel: IPCInflightChannel) => {
    const asset = channel.payload.asset as AIModelAsset
    const assetPath = AIModelFileSystem.getAssetPath(asset.id)

    // Normally we don't update assets that are on disk, rather we change the endpoint
    // and name of them with a new version. There are some special cases though
    if (await fs.exists(assetPath)) {
      if (
        AIModelAssetId.isProvider(asset.id, AIModelIdProvider.HuggingFace) &&
        asset.id.endsWith('.gguf')
      ) {
        // Huggingface guff assets can be updated but need to be handled differently
        const { readGgufFileInfo } = await importLlama()
        const remoteModelInfo = await readGgufFileInfo(asset.url)
        const localModelInfo = await readGgufFileInfo(assetPath)
        if (remoteModelInfo.version === localModelInfo.version) {
          return
        }
      } else {
        // Asset doesn't update, so if it's on disk it's up to date
        return
      }
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
        await fs.ensureDir(path.dirname(assetPath))
        await fs.move(file.path, assetPath, { overwrite: true })
      })
    }

    reportProgress.cancel()
  }

  /* **************************************************************************/
  // MARK: Huggingface
  /* **************************************************************************/

  #handleFetchManifestHuggingFace = async (channel: IPCInflightChannel) => {
    // We can support huggingface models by generating a dynamic manifest from the gguf metadata

    // Extract and validate the owner, repo, and model
    const owner = getNonEmptyString(channel.payload.owner, undefined)
    const repo = getNonEmptyString(channel.payload.repo, undefined)
    const model = getNonEmptyString(channel.payload.model, undefined)
    if (!owner || !repo || !model) { throw new Error('Huggingface params invalid') }

    const modelId = new AIModelId({ provider: AIModelIdProvider.HuggingFace, owner, repo, model })
    const ggufAssetId = AIModelAssetId.generate(modelId.provider, modelId.owner, modelId.repo, modelId.model)
    const ggufUrl = AIModelAssetId.getRemoteUrl(ggufAssetId)

    // Fetch the gguf metadata
    const {
      fileSize,
      modelInfo,
      resolvedConfig,
      flashAttentionConfig
    } = Object.assign({}, ...await Promise.all([
      (async () => {
        const { getLlama, readGgufFileInfo, GgufInsights } = await importLlama()
        const llama = await getLlama({ build: 'never' })
        const modelInfo = await readGgufFileInfo(ggufUrl)
        const insights = await GgufInsights.from(modelInfo, llama)
        const resolvedConfig = await insights.configurationResolver.resolveAndScoreConfig()
        const flashAttentionConfig = await insights.configurationResolver.resolveAndScoreConfig({ flashAttention: true })

        return {
          modelInfo,
          resolvedConfig,
          flashAttentionConfig
        }
      })(),
      (async () => {
        const res = await fetch(ggufUrl)
        const fileSize = parseInt(res.headers.get('content-length'))
        return { fileSize: isNaN(fileSize) ? 0 : fileSize }
      })()
    ]))
    const modelMetadata = modelInfo.metadata
    const modelTokenizer = modelInfo.metadata.tokenizer.ggml

    // Generate the manifest
    const manifest: AIModelManifest = {
      id: modelId.toString(),
      name: `HuggingFace: ${path.basename(modelId.model, path.extname(modelId.model))}`,
      version: `${modelInfo.version}.0.0`,
      manifestVersion: 2,
      generated: {
        ts: Date.now(),
        version: config.version
      },
      formats: {
        [AIModelFormat.GGUF]: {
          licenseUrl: modelMetadata.general['license.link']
            ? modelMetadata.general['license.link']
            : modelMetadata.general.license
              ? `https://www.google.com/search?q=${encodeURIComponent(modelMetadata.general.license)}`
              : '',
          model: ggufAssetId,
          assets: [{ id: ggufAssetId, url: ggufUrl, size: fileSize }]
        }
      },
      config: {
        topK: [1, 50, 100],
        topP: [0.0, 0.9, 1.0],
        temperature: [0.0, 0.6, 1.0],
        repeatPenalty: [-2.0, 1.5, 2.0],
        flashAttention: flashAttentionConfig.compatibilityScore >= 1
      },
      tokens: {
        max: resolvedConfig.resolvedValues.contextSize,
        default: Math.min(2048, resolvedConfig.resolvedValues.contextSize),
        stop: [modelTokenizer.tokens[modelTokenizer.eos_token_id]],
        bosToken: modelTokenizer.tokens[modelTokenizer.bos_token_id],
        eosToken: modelTokenizer.tokens[modelTokenizer.eos_token_id]
      },
      prompts: {
        languageModel: {
          template: modelMetadata.tokenizer.chat_template
        }
      }
    }
    return manifest
  }
}

export default ModelDownloadAPIHandler
