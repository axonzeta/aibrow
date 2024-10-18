const path = require('node:path')
const os = require('node:os')

process.stdin.pause()

/* **************************************************************************/
// MARK: Paths
/* **************************************************************************/

/**
 * @returns the local app data path
 */
function getSystemLocalAppDataPath () {
  if (process.env.LOCALAPPDATA) {
    return process.env.LOCALAPPDATA
  } else if (process.env.APPDATA) {
    return process.env.APPDATA
  } else {
    switch (process.platform) {
      case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support')
      case 'linux': return path.join(os.homedir(), '.config')
      case 'win32': return path.join(os.homedir(), 'AppData', 'Local')
    }
  }
}

/**
 * @returns the path to the app data
 */
function getAppDataPath () {
  return path.join(getSystemLocalAppDataPath(), 'Axonzeta/AiBrow')
}

/* **************************************************************************/
// MARK: Main
/* **************************************************************************/

async function main () {
  const mainPath = './main.cjs'

  globalThis.__boot = {
    appDataPath: getAppDataPath()
  }

  await import(/* webpackIgnore: true */ mainPath)
  await new Promise(() => {})
}

main()
