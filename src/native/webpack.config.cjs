const path = require('path')
const bootWebpackConfig = require('./boot/webpack.config.cjs')
const mainWebpackConfig = require('./main/webpack.config.cjs')

module.exports = function (taskConfig, { mode }) {
  const {
    outDir: rootOutDir,
    nodeModulesDir,
    pkg,
    pkgLock,
    config
  } = taskConfig
  const dirs = {
    src: __dirname,
    out: path.join(rootOutDir, 'native'),
    nodeModules: nodeModulesDir
  }

  return [
    // Boot runs a clean before starting
    bootWebpackConfig(dirs, pkg, mode),
    mainWebpackConfig(
      dirs,
      pkg,
      pkgLock,
      mode,
      config
    )
  ]
}
