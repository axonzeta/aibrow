const path = require('path')
const fs = require('fs-extra')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const { pathsToWebpackAlias } = require('../../../build/tsconfig_util.cjs')

/* **************************************************************************/
// MARK: Node modules
/* **************************************************************************/

/**
 * Tracks the node modules that are required during the import process,
 * creating a list of externals that we can then use later to compile a
 * new node_modules directory
 * @param pkg: the main package.json
 * @param nodeModulesDir: the node_modules path
 * @param $externals: the externals object to update
 * @returns a function that can be used in the webpack externals
 */
function externalNodeModulesTracker (pkg, nodeModulesDir, $externals) {
  // It's not possible to compile all the native modules, because for example,
  // some use fs to read json files from within the package. To deal with this
  // watch for the deps the app tries to require and then make a node of them.
  //
  // We can then use these to run an install and grab just the node deps that
  // we need

  // Dependencies that we should compile in using webpack
  const INTERNAL_DEPS = [
    'nanoid' // We're an esm module, use webpack to pack it in
  ]

  // Dependencies that we should set as ESM modules
  const ESM_DEPS = [
    'node-llama-cpp', // This uses an async import
    '@aibrow/node-llama-cpp' // This uses an async import
  ]

  // Predefined dependencies that we should always add
  const PREDEFINED_DEPS = [
    'node-llama-cpp', // We tell webpack to ignore this because it doesn't like compiling it
    '@aibrow/node-llama-cpp' // We tell webpack to ignore this because it doesn't like compiling it
  ]

  // Seed the externals with the predefined deps
  for (const dep of PREDEFINED_DEPS) {
    $externals[dep] = pkg.dependencies[dep]
  }

  // Return the externals function for use
  return function ({ context, request }, callback) {
    // Compile into the bundle
    if (INTERNAL_DEPS.includes(request)) {
      return callback()
    }

    if (/^[a-zA-Z@]+$/.test(request)) {
      let modulePath

      // Look to see if the require is within the node_modules directory (i.e. sub-package)
      const nodeModulesRel = path.relative(nodeModulesDir, context)
      if (nodeModulesRel && !nodeModulesRel.startsWith('..') && !path.isAbsolute(nodeModulesRel)) {
        modulePath = nodeModulesRel
      } else if (fs.existsSync(path.join(nodeModulesDir, request))) {
        modulePath = request
      }

      // If we get a module path, then figure out the dependency
      if (modulePath) {
        const pathCmp = modulePath.split(path.sep)
        const packageName = pathCmp[0].startsWith('@')
          ? `${pathCmp[0]}/${pathCmp[1]}`
          : pathCmp[0]

        if (pkg.dependencies[packageName]) {
          $externals[packageName] = pkg.dependencies[packageName]
        }

        return ESM_DEPS.includes(packageName)
          ? callback(null, `module ${request}`)
          : callback(null, `commonjs ${request}`)
      }
    }

    // Don't externalize
    return callback()
  }
}

/* **************************************************************************/
// MARK: Webpack
/* **************************************************************************/

/**
 * @param directories: the directories to use
 * @param pkg: the node package.json
 * @param pkgLock: the node package-lock.json
 * @param mode: the build mode
 * @param config: the app config
 * @returns the webpack config
 */
module.exports = function (
  { src: srcDir, out: outDir, nodeModules: nodeModulesDir },
  pkg,
  pkgLock,
  mode,
  config
) {
  const bootOutputPath = path.join(outDir, 'boot.cjs')

  const externalDependencies = {}

  return {
    target: 'node',
    entry: path.join(srcDir, 'main/index.ts'),
    output: { filename: 'main.cjs', path: outDir },
    externals: [
      externalNodeModulesTracker(pkg, nodeModulesDir, externalDependencies)
    ],
    plugins: [
      new webpack.DefinePlugin({
        'process.env.EXEC_PATH': JSON.stringify(
          process.platform === 'win32' ? path.join(outDir, 'boot.bat') : bootOutputPath
        )
      }),
      new CaseSensitivePathsPlugin(),
      new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
      {
        apply: (compiler) => {
          compiler.hooks.done.tapPromise('ExportCustomPackage', async ({ compilation }) => {
            if (compilation.errors.length) { return }
            await fs.writeJSON(path.join(outDir, 'main.package.json'), { dependencies: externalDependencies }, { spaces: 2 })
          })
        }
      }
    ],
    optimization: {
      minimize: mode === 'production',
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: { comments: false }
          }
        })
      ]
    },
    module: {
      rules: [
        {
          test: /(\.ts|\.tsx)$/,
          use: { loader: 'ts-loader' },
          exclude: [path.resolve(nodeModulesDir)],
          include: [
            path.resolve(srcDir),
            path.join(srcDir, '../shared')
          ]
        },
        {
          test: /\.node$/,
          loader: 'node-loader'
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: pathsToWebpackAlias(path.join(srcDir, 'main/tsconfig.json'))
    }
  }
}
