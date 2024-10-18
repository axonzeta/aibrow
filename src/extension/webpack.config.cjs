const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { pathsToWebpackAlias } = require('../../build/tsconfig_util.cjs')
const webpack = require('webpack')

module.exports = function ({ outDir, nodeModulesDir, pkg, config }, { mode }) {
  const srcDir = __dirname

  return ['crx', 'moz', 'extlib'].map((browser) => {
    let entry
    let output
    let copyPatterns
    switch (browser) {
      case 'extlib':
        entry = {
          index: path.join(srcDir, 'contentscript-main/index.ts')
        }
        output = {
          filename: '[name].js',
          path: path.join(outDir, config.extensionLibrary.name),
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
              for (const key of ['version', 'author', 'license']) {
                manifest[key] = pkg[key]
              }
              return JSON.stringify(manifest, null, 2)
            }
          }
        ]
        break
      default:
        entry = {
          background: path.join(srcDir, 'background/index.ts'),
          'contentscript-isolated': path.join(srcDir, 'contentscript-isolated/index.ts'),
          'contentscript-main': path.join(srcDir, 'contentscript-main/index.ts'),
          'permission-popup': path.join(srcDir, 'permission-popup/index.ts'),
          options: path.join(srcDir, 'options/index.ts')
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
          { from: path.join(srcDir, 'permission-popup/index.html'), to: 'permission-popup.html', force: true },
          { from: path.join(srcDir, 'options/index.html'), to: 'options.html', force: true },
          { from: path.join(srcDir, 'icons'), to: 'icons', force: true }
        ]
        break
    }

    return {
      entry,
      output,
      devtool: mode === 'development' ? 'inline-cheap-source-map' : undefined,
      plugins: [
        new webpack.DefinePlugin({ 'process.env.BROWSER': JSON.stringify(browser) }),
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
        new CopyWebpackPlugin({ patterns: copyPatterns })
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
              'style-loader',
              'css-loader',
              'less-loader'
            ]
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
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
  })
}
