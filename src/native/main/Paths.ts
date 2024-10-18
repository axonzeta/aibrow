import path from 'path'
import config from '#Shared/Config'

if (!globalThis.__boot?.appDataPath) {
  throw new Error('Paths not configured')
}

export const appData = globalThis.__boot.appDataPath
export const models = path.join(appData, 'models')
export const assets = path.join(appData, 'assets')
export const runtimeBase = path.join(appData, 'app')
export const currentRuntime = path.join(runtimeBase, config.version)
export const currentExecPath = path.join(currentRuntime, process.platform === 'win32' ? `${config.native.execName}.exe` : config.native.execName)
