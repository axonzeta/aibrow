import * as Paths from '../Paths'
import path from 'node:path'
import crypto from 'node:crypto'
import sea from 'node:sea'
import fs from 'fs-extra'
import Logger from '../Logger'
import config from '#Shared/Config'
import semver from 'semver'
import sanitizeFilename from 'sanitize-filename'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { withDir } from 'tmp-promise'
import { UpdateResult, kUpdatePublicKey } from '#Shared/Updater'
import childProcess from 'node:child_process'
import lockfile from 'proper-lockfile'
import urlJoin from 'url-join'

/* **************************************************************************/
// MARK: Updating
/* **************************************************************************/

/**
 * Validates an update
 * @param filepath: the path to the update binary
 * @param signature: the signature of the update
 * @return true if the update is valid, false otherwise
 */
async function verifyUpdate (filepath: string, signature: string) {
  const verify = crypto.createVerify('sha256')
  verify.update(await fs.readFile(filepath))
  verify.end()
  return verify.verify(kUpdatePublicKey, signature, 'hex')
}

/**
 * Checks for update
 * @param apiVersion=config.native.apiVersion: the supported api version
 * @param dry=false: if false, just checks for an update, if true, updates
 * @returns true if we updated, false otherwise
 */
export async function update (apiVersion = config.native.apiVersion, dry = false) {
  if (!sea.isSea()) {
    return UpdateResult.NoUpdate
  }

  // Get an update lock
  const updateLockPath = path.join(Paths.appData, 'update.lock')
  let updateLockRelease: any
  try {
    updateLockRelease = await lockfile.lock(updateLockPath)
  } catch (ex) {
    if (ex.message.startsWith('ENOENT')) {
      fs.writeJSONSync(updateLockPath, { version: config.version, ts: Date.now() })
      updateLockRelease = await lockfile.lock(updateLockPath)
    } else {
      throw ex
    }
  }
  await fs.writeJSON(updateLockPath, { version: config.version, ts: Date.now() })

  // Start the update process
  try {
    const res = await fetch(urlJoin(config.native.updateUrl, process.platform, process.arch, `latest_${apiVersion}.json`))
    if (!res.ok || !res.body) {
      Logger.log(`Failed to check for updates: ${res.status}`)
      return UpdateResult.NetworkError
    }
    const manifest = (await res.json()) as { version: string, url: string, signature: string }

    if (
      !manifest.version ||
      !manifest.url ||
      !semver.valid(manifest.version)
    ) {
      Logger.log('Invalid manifest')
      return UpdateResult.Error
    }
    if (manifest.version === config.version) {
      Logger.log('Already up to date')
      return UpdateResult.NoUpdate
    }

    if (dry) {
      return UpdateResult.Updated
    }

    // Fetch the update binary
    Logger.log(`Downloading version ${manifest.version} from ${manifest.url}`)
    const versionDir = path.join(Paths.runtimeBase, sanitizeFilename(manifest.version))
    const applicationPath = path.join(versionDir, process.platform === 'win32'
      ? `${config.native.execName}.exe`
      : config.native.execName)
    const updateResult = await withDir(async (tmp) => {
      const downloadPath = path.join(tmp.path, config.native.execName)
      const res = await fetch(manifest.url, {
        headers: { 'Accept-Encoding': 'gzip, deflate, br' }
      })
      if (!res.ok || !res.body) {
        Logger.log('Failed to download binary')
        await fs.remove(downloadPath)
        return UpdateResult.NetworkError
      }

      const writer = fs.createWriteStream(downloadPath)
      const reader = Readable.fromWeb(res.body)
      await finished(reader.pipe(writer))

      // Verify the update
      if (!await verifyUpdate(downloadPath, manifest.signature)) {
        await fs.remove(downloadPath)
        Logger.log('Failed to verify update')
        return UpdateResult.SignatureError
      }

      // Move the updater into its normal runtime directory
      await fs.ensureDir(versionDir)
      await fs.emptyDir(versionDir)
      await fs.move(downloadPath, applicationPath)
      await fs.chmod(applicationPath, 0o755)

      // Run the install script on the updater
      childProcess.spawn(applicationPath, ['--install'], {
        detached: true,
        stdio: 'ignore'
      }).unref()

      return UpdateResult.Updated
    }, { unsafeCleanup: true })
    Logger.log('Update success')

    return updateResult
  } finally {
    await updateLockRelease()
  }
}

export { UpdateResult }
