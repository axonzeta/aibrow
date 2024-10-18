const fs = require('fs-extra')
const path = require('path')

/**
 * Converts the paths in a tsconfig.json file to a format that webpack can understand
 * @param tsconfigPath: the path to the tsconfig.json file
 * @returns a mapping of paths to their resolutions
 */
function pathsToWebpackAlias (tsconfigPath) {
  const tsconfigDir = path.dirname(tsconfigPath)
  const tsconfig = fs.readJsonSync(tsconfigPath)

  const paths = tsconfig.compilerOptions.paths ?? {}
  return Object.entries(paths).reduce((acc, [tsId, [tsResolution]]) => {
    const id = tsId.split('/')[0]
    const resolution = path.join(tsconfigDir, tsResolution.endsWith('*') ? tsResolution.slice(0, -1) : tsResolution)
    acc[id] = resolution
    return acc
  }, {})
}

module.exports = {
  pathsToWebpackAlias
}
