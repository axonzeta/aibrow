const path = require('path')
const fs = require('fs-extra')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { pathsToWebpackAlias } = require('../../build/tsconfig_util.cjs')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const childProcess = require('child_process')

/**
 * Creates the contentscript types generator plugin
 * @param srcDir: the source directory
 * @param outDir: the output directory to place index.d.ts and tsconfig.json
 * @returns a new plugin instance
 */
function rollupContentScriptTypesPlugin (srcDir, outDir) {
  return {
    apply: (compiler) => {
      compiler.hooks.afterEmit.tapAsync('rollup-content-script-types-plugin', async (compilation, callback) => {
        try {
          const typesOutPath = path.join(outDir, 'index.d.ts')

          // Build the definitions
          await new Promise((resolve, reject) => {
            const child = childProcess.spawn('npx', [
              'rollup',
              '--config', './types-rollup.config.js',
              '--input', path.join(srcDir, 'contentscript-main/index.ts'),
              '--format es',
              '--file', typesOutPath
            ], {
              shell: true, stdio: 'inherit', detatched: true, cwd: __dirname
            })
            child.on('close', (code) => {
              if (code === 0) {
                resolve()
              } else {
                reject(new Error(`Failed to run rollup with exit code ${code}`))
              }
            })
            child.on('error', (err) => {
              reject(new Error(`Rollup failed to generate types ${err}`))
            })
          })

          await fs.writeJSON(path.join(outDir, 'tsconfig.json'), {
            compilerOptions: {
              module: 'node16',
              lib: ['es6'],
              noImplicitAny: true,
              noImplicitThis: true,
              strictFunctionTypes: true,
              strictNullChecks: true,
              types: [],
              noEmit: true,
              forceConsistentCasingInFileNames: true
            },
            files: ['index.d.ts']
          }, { spaces: 2 })

          callback()
        } catch (ex) {
          compilation.errors.push(ex)
          callback()
        }
      })
    }
  }
}

module.exports = function ({ outDir, nodeModulesDir, pkg, config }, { mode }) {
  const srcDir = __dirname

  return ['crx', 'moz', 'extlib'].map((browser) => {
    let entry
    let output
    let copyPatterns
    let plugins
    switch (browser) {
      case 'extlib':
        entry = {
          index: path.join(srcDir, 'contentscript-main/index.ts')
        }
        output = {
          filename: '[name].js',
          path: path.join(outDir, browser),
          library: config.extensionLibrary.name,
          libraryTarget: 'umd',
          umdNamedDefine: true
        }
        copyPatterns = [
          {
            from: path.join(srcDir, `${browser}-package.json`),
            to: 'package.json',
            force: true,
            transform: (content) => {
              const manifest = JSON.parse(content.toString())
              manifest.name = config.extensionLibrary.name
              for (const key of ['version', 'author', 'license', 'description', 'repository']) {
                manifest[key] = pkg[key]
              }
              return JSON.stringify(manifest, null, 2)
            }
          },
          { from: path.join(srcDir, `${browser}-README.md`), to: 'README.md', force: true }
        ]
        plugins = [
          rollupContentScriptTypesPlugin(srcDir, path.join(outDir, browser))
        ]
        break
      default: {
        const uiEntryPoints = ['ui-permission-popup', 'ui-model-install-popup', 'ui-options']
        entry = {
          background: path.join(srcDir, 'background/index.ts'),
          'contentscript-isolated': path.join(srcDir, 'contentscript-isolated/index.ts'),
          'contentscript-main': path.join(srcDir, 'contentscript-main/index.ts'),
          ...uiEntryPoints.reduce((acc, key) => {
            acc[key] = path.join(srcDir, `${key}/index.ts`)
            return acc
          }, {})
        }
        output = {
          filename: '[name].js',
          path: path.join(outDir, 'extension', browser)
        }
        copyPatterns = [
          {
            from: path.join(srcDir, `${browser}-manifest.json`),
            to: 'manifest.json',
            force: true,
            transform: (content) => {
              const manifest = JSON.parse(content.toString())
              manifest.version = pkg.version
              return JSON.stringify(manifest, null, 2)
            }
          },
          { from: path.join(srcDir, 'icons'), to: 'icons', force: true }
        ]
        plugins = [
          ...uiEntryPoints.map((key) => new HtmlWebpackPlugin({
            chunks: [key],
            filename: `${key}.html`,
            template: path.join(srcDir, `${key}/index.html`),
            title: 'AiBrow',
            meta: {
              viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'
            }
          }))
        ]
        break
      }
    }

    return {
      entry,
      output,
      devtool: mode === 'development' ? 'inline-cheap-source-map' : undefined,
      plugins: [
        ...plugins,
        new webpack.DefinePlugin({ 'process.env.BROWSER': JSON.stringify(browser) }),
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
        new CopyWebpackPlugin({ patterns: copyPatterns }),
        new MiniCssExtractPlugin()
      ],
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
            test: /\.less$/i,
            use: [
              MiniCssExtractPlugin.loader,
              'css-loader',
              'less-loader'
            ]
          },
          {
            test: /\.css$/,
            use: [
              MiniCssExtractPlugin.loader,
              'css-loader'
            ]
          }
        ]
      },
      resolve: {
        alias: pathsToWebpackAlias(path.join(srcDir, 'tsconfig.json')),
        extensions: [
          '.ts',
          '.js',
          '.json'
        ]
      },
      optimization: {
        minimize: false,
        minimizer: [
          new TerserPlugin({
            extractComments: false,
            terserOptions: {
              format: { comments: false }
            }
          })
        ]
      }
    }
  }).concat([{
    name: 'domtypeslib',
    mode: 'development',
    entry: {},
    output: {
      filename: '[name].js',
      path: path.join(outDir, 'domtypeslib')
    },
    plugins: [
      rollupContentScriptTypesPlugin(srcDir, path.join(outDir, 'domtypeslib')),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(srcDir, 'domtypeslib-package.json'),
            to: 'package.json',
            force: true,
            transform: (content) => {
              const manifest = JSON.parse(content.toString())
              manifest.name = config.domTypesLibrary.name
              for (const key of ['version', 'author', 'license', 'description', 'repository']) {
                manifest[key] = pkg[key]
              }
              return JSON.stringify(manifest, null, 2)
            }
          },
          { from: path.join(srcDir, 'domtypeslib-README.md'), to: 'README.md', force: true }
        ]
      })
    ]
  }])
}
