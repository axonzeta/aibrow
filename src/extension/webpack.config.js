import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CircularDependencyPlugin from 'circular-dependency-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { pathsToWebpackAlias } from '../../build/tsconfig_util.js'
import webpack from 'webpack'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import rollupTypesPlugin from '../../build/rollupTypesPlugin.js'

export default function ({ outDir, nodeModulesDir, pkg, config }, { mode }) {
  const srcDir = import.meta.dirname

  const uiEntryPoints = ['ui-permission-popup', 'ui-model-install-popup', 'ui-options']
  return ['crx', 'moz'].map((browser) => {
    return {
      entry: {
        background: path.join(srcDir, 'background/index.ts'),
        'contentscript-isolated': path.join(srcDir, 'contentscript-isolated/index.ts'),
        'contentscript-main': path.join(srcDir, 'contentscript-main/index.ts'),
        'contentscript-main-override': path.join(srcDir, 'contentscript-main-override/index.ts'),
        ...uiEntryPoints.reduce((acc, key) => {
          acc[key] = path.join(srcDir, `${key}/index.ts`)
          return acc
        }, {})
      },
      output: {
        filename: '[name].js',
        path: path.join(outDir, 'extension', browser)
      },
      devtool: mode === 'development' ? 'inline-cheap-source-map' : undefined,
      plugins: [
        ...uiEntryPoints.map((key) => new HtmlWebpackPlugin({
          chunks: [key],
          filename: `${key}.html`,
          template: path.join(srcDir, `${key}/index.html`),
          title: 'AiBrow',
          meta: {
            viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'
          }
        })),
        new webpack.DefinePlugin({ 'process.env.BROWSER': JSON.stringify(browser) }),
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
        new CopyWebpackPlugin({
          patterns: [
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
        }),
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
      rollupTypesPlugin(
        path.join(srcDir, 'contentscript-main/index.ts'),
        path.join(import.meta.dirname, 'types-rollup.config.js'),
        path.join(outDir, 'domtypeslib', 'index.d.ts')
      ),
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
