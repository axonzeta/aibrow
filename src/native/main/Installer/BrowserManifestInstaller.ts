import fs from 'fs-extra'
import path from 'node:path'
import os from 'node:os'
import config from '#Shared/Config'
import Logger from '../Logger'
import * as Paths from '../Paths'
import Winreg from 'winreg'
import sea from 'node:sea'

/* **************************************************************************/
// MARK: Paths
/* **************************************************************************/

/**
 * Gets the path to the executable
 * @returns the path
 */
function getApplicationPath () {
  return sea.isSea()
    ? Paths.currentExecPath
    : process.env.EXEC_PATH
}

/* **************************************************************************/
// MARK: Installation
/* **************************************************************************/

/**
 * Installs the browser manifests
 */
export async function install () {
  const applicationPath = getApplicationPath()
  const baseHostManifest = {
    name: config.native.identifier,
    description: config.native.description,
    path: applicationPath,
    type: 'stdio'
  }
  const crxHostManifest = {
    ...baseHostManifest,
    allowed_origins: config.extension.crxExtensionIds.map((id) => (
      `chrome-extension://${id}/`
    ))
  }
  const mozHostManifest = {
    ...baseHostManifest,
    allowed_extensions: config.extension.mozExtensionIds.map((id) => id)
  }

  if (process.platform === 'win32') {
    await fs.ensureDir(Paths.appData)
    const crxManifestPath = path.join(Paths.appData, `crx-${config.native.identifier}.json`)
    await fs.writeJSON(crxManifestPath, crxHostManifest, { spaces: 2 })
    const mozManifestPath = path.join(Paths.appData, `moz-${config.native.identifier}.json`)
    await fs.writeJSON(mozManifestPath, mozHostManifest, { spaces: 2 })

    const crxRegistryKeys = [
      `\\Software\\Google\\Chrome\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Google\\Chrome Beta\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Google\\Chrome Dev\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Google\\Chrome SxS\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Chromium\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Vivaldi\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${config.native.identifier}`,
      `\\Software\\Wavebox\\NativeMessagingHosts\\${config.native.identifier}`
    ]
    const mozRegistryKeys = [
      `\\Software\\Mozilla\\NativeMessagingHosts\\${config.native.identifier}`
    ]

    const tasks = [
      { manifestPath: crxManifestPath, registryKeys: crxRegistryKeys },
      { manifestPath: mozManifestPath, registryKeys: mozRegistryKeys }
    ]

    for (const { manifestPath, registryKeys } of tasks) {
      for (const key of registryKeys) {
        await new Promise((resolve, reject) => {
          const winreg = new Winreg({ hive: Winreg.HKCU, key })
          winreg.set(Winreg.DEFAULT_VALUE, Winreg.REG_SZ, manifestPath, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(undefined)
            }
          })
        })
      }
    }
  } else {
    const homedir = os.homedir()
    let crxHostPaths: string[] = []
    let mozHostPaths: string[] = []
    switch (process.platform) {
      case 'darwin':
        crxHostPaths = [
          path.join(homedir, 'Library/Application Support/Google/Chrome/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Google/Chrome Beta/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Google/Chrome Dev/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Google/Chrome Canary/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Chromium/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Vivaldi/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Microsoft Edge/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/Arc/User Data/NativeMessagingHosts/'),
          path.join(homedir, 'Library/Application Support/WaveboxApp/NativeMessagingHosts/')
        ]
        mozHostPaths = [
          path.join(homedir, 'Library/Application Support/Mozilla/NativeMessagingHosts/')
        ]
        break
      case 'linux':
        crxHostPaths = [
          path.join(homedir, '.config/google-chrome/NativeMessagingHosts/'),
          path.join(homedir, '.config/google-chrome-beta/NativeMessagingHosts/'),
          path.join(homedir, '.config/google-chrome-unstable/NativeMessagingHosts/'),
          path.join(homedir, '.config/chromium/NativeMessagingHosts/'),
          path.join(homedir, '.config/vivaldi/NativeMessagingHosts/'),
          path.join(homedir, '.config/wavebox/NativeMessagingHosts/')
        ]
        mozHostPaths = [
          path.join(homedir, '.mozilla/native-messaging-hosts/')
        ]
        break
    }

    const tasks = [
      { hostManifest: crxHostManifest, hostPaths: crxHostPaths },
      { hostManifest: mozHostManifest, hostPaths: mozHostPaths }
    ]
    for (const { hostManifest, hostPaths } of tasks) {
      for (const hostPath of hostPaths) {
        const manifestPath = path.join(hostPath, `${config.native.identifier}.json`)
        Logger.log(`Writing browser manifest ${manifestPath}`)
        try {
          await fs.ensureDir(hostPath)
          await fs.writeJSON(manifestPath, hostManifest, { spaces: 2 })
        } catch (ex) {
          Logger.error(`Failed to write browser manifest ${manifestPath}`, ex.message)
        }
      }
    }
  }
}
