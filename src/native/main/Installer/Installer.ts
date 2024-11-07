import * as Paths from '../Paths'
import path from 'node:path'
import sea from 'node:sea'
import fs from 'fs-extra'
import Logger from '../Logger'
import config from '#Shared/Config'
import semver from 'semver'
import { isDevMode } from '../Env'
import * as BrowserManifestInstaller from './BrowserManifestInstaller'
import { importLlama } from '../Llama'
import sanitizeFilename from 'sanitize-filename'
import { AIModelManifest } from '#Shared/AIModelManifest'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'

/* **************************************************************************/
// MARK: Installing
/* **************************************************************************/

/**
 * Install the current binary
 */
export async function install () {
  Logger.log(`Start install ${isDevMode() ? '(dev)' : ''} ${sea.isSea() ? '(sea)' : ''}`)
  if (sea.isSea()) {
    if (process.platform === 'darwin') {
      Logger.log('Warmup gatekeeper')
      // We can't staple binaries which means that we need to be online to validate some
      // of our libs. Because we could be offline, do this now when there's a higher chance
      // we're online
      try {
        const { getLlama } = await importLlama()
        await getLlama({ build: 'never' })
      } catch (ex) {
        Logger.error('Failed to warmup gatekeeper', ex.message)
      }
    }
  }

  Logger.log('Install manifests')
  await BrowserManifestInstaller.install()

  Logger.log('Install complete')
}

/**
 * Installs a local model
 * @param rawModelPath: the path to the model manifest
 *
 * The model manifest and all assets must be in the same
 * directory as the executable we're running
 */
export async function installLocalModel (rawModelPath: string) {
  if (rawModelPath) {
    Logger.log(`Installing model: ${rawModelPath}`)
    try {
      // Read the model manifest
      const modelPath = path.join(path.dirname(process.execPath), sanitizeFilename(rawModelPath))
      let modelManifest: AIModelManifest
      try {
        modelManifest = await fs.readJSON(modelPath)
      } catch (ex) {
        throw new Error('Failed to load model manifest')
      }

      // Install the assets
      for (const { id } of modelManifest.assets) {
        try {
          const assetPath = AIModelFileSystem.getAssetPath(id)
          await fs.ensureDir(path.dirname(assetPath))
          await fs.move(path.join(path.dirname(modelPath), sanitizeFilename(id)), assetPath)
        } catch (ex) {
          throw new Error(`Failed to install asset ${id}`)
        }
      }

      // Write the manifest
      await AIModelFileSystem.writeModelManifest(modelManifest)
      Logger.log(`Installed model: ${rawModelPath}`)
    } catch (ex) {
      Logger.error(`Failed to install model: ${ex.message}`)
    }
  }
}

/**
 * Cleans up any old installations
 */
export async function cleanup () {
  for (const version of await fs.readdir(Paths.runtimeBase)) {
    if (semver.valid(version) && semver.lt(version, config.version)) {
      const versionDir = path.join(Paths.runtimeBase, version)
      Logger.log(`Removing old version ${version}`)
      try {
        await fs.remove(versionDir)
      } catch (ex) {
        Logger.error(`Failed to remove old version ${version}`, ex.message)
      }
    }
  }
}
