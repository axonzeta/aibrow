import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CircularDependencyPlugin from 'circular-dependency-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { pathsToWebpackAlias } from '../../build/tsconfig_util.js'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import rollupTypesPlugin from '../../build/rollupTypesPlugin.js'

export default function ({ outDir, nodeModulesDir, pkg, config }, { mode }) {
  const srcDir = import.meta.dirname

  return {
    entry: {
      index: path.join(srcDir, 'index.ts')
    },
    output: {
      filename: '[name].js',
      path: path.join(outDir, 'extension-library'),
      library: config.extensionLibrary.name,
      libraryTarget: 'umd',
      libraryExport: 'default',
      umdNamedDefine: true
    },
    devtool: mode === 'development' ? 'inline-cheap-source-map' : undefined,
    plugins: [
      rollupTypesPlugin(
        path.join(srcDir, 'index.ts'),
        path.join(import.meta.dirname, 'types-rollup.config.js'),
        path.join(outDir, 'extension-library/index.d.ts')
      ),
      new CleanWebpackPlugin(),
      new CaseSensitivePathsPlugin(),
      new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(srcDir, 'template-package.json'),
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
          { from: path.join(srcDir, 'template-README.md'), to: 'README.md', force: true }
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
}
