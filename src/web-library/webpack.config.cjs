const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { pathsToWebpackAlias } = require('../../build/tsconfig_util.cjs')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const rollupTypesPlugin = require('../../build/rollupTypesPlugin.cjs')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = function ({ outDir, nodeModulesDir, pkg, config }, { mode }) {
  return ['library', 'frame'].map((component) => {
    const srcDir = __dirname

    let output
    let plugins
    let alias
    switch (component) {
      case 'library':
        output = {
          filename: '[name].js',
          path: path.join(outDir, 'web-library'),
          library: config.webLibrary.name,
          libraryTarget: 'umd',
          umdNamedDefine: true
        }
        plugins = [
          rollupTypesPlugin(
            path.join(srcDir, component, 'index.ts'),
            path.join(__dirname, 'types-rollup.config.js'),
            path.join(outDir, 'web-library/index.d.ts')
          ),
          new CopyWebpackPlugin({
            patterns: [
              {
                from: path.join(srcDir, 'template-package.json'),
                to: 'package.json',
                force: true,
                transform: (content) => {
                  const manifest = JSON.parse(content.toString())
                  manifest.name = config.webLibrary.name
                  for (const key of ['version', 'author', 'license', 'description', 'repository']) {
                    manifest[key] = pkg[key]
                  }
                  return JSON.stringify(manifest, null, 2)
                }
              },
              { from: path.join(srcDir, 'template-README.md'), to: 'README.md', force: true }
            ]
          })
        ]
        break
      case 'frame':
        output = {
          filename: '[name].js',
          path: path.join(outDir, 'web-library-frame')
        }
        plugins = [
          new HtmlWebpackPlugin({
            title: 'AiBrow',
            scriptLoading: 'blocking'
          })
        ]
        alias = {
          '@huggingface/transformers': path.resolve(path.join(nodeModulesDir, '@huggingface/transformers'))
        }
        break
    }

    return {
      entry: {
        index: path.join(srcDir, component, 'index.ts')
      },
      output,
      devtool: mode === 'development' ? 'inline-cheap-source-map' : undefined,
      plugins: [
        ...plugins,
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
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
        alias: {
          ...alias,
          ...pathsToWebpackAlias(path.join(srcDir, 'tsconfig.json'))
        },
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
