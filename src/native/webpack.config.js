import path from 'path'
import bootWebpackConfig from './boot/webpack.config.js'
import mainWebpackConfig from './main/webpack.config.js'

export default function (taskConfig, { mode }) {
  const {
    outDir: rootOutDir,
    nodeModulesDir,
    pkg,
    pkgLock,
    config
  } = taskConfig
  const dirs = {
    src: import.meta.dirname,
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
