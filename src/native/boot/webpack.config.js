import path from 'path'
import fs from 'fs-extra'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CircularDependencyPlugin from 'circular-dependency-plugin'
import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'

/**
 * @param dirs: the directories
 * @param config: the main app package
 * @param mode: production or development
 * @returns the webpack config
 */
export default function ({ src: srcDir, out: outDir }, pkg, mode) {
  const outputName = 'boot.cjs'
  const outputPath = path.join(outDir, outputName)
  return {
    target: 'node',
    entry: path.join(srcDir, 'boot/index.cjs'),
    output: { filename: 'boot.cjs', path: outDir },
    plugins: [
      new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: ['**/*'] }),
      new CaseSensitivePathsPlugin(),
      new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
      new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
      ...process.platform === 'win32'
        ? [{
          apply: (compiler) => {
            compiler.hooks.done.tapPromise('FinalizeDevExecutable', async ({ compilation }) => {
              if (compilation.errors.length) { return }
              await fs.writeFile(path.join(outDir, 'boot.bat'), `@echo off\nnode "${outputPath}" %*\n`)
            })
          }
        }]
        : [
          new webpack.BannerPlugin({ banner: `#!${process.execPath}`, raw: true, entryOnly: true }),
          {
            apply: (compiler) => {
              compiler.hooks.done.tapPromise('FinalizeDevExecutable', async ({ compilation }) => {
                if (compilation.errors.length) { return }
                await fs.chmod(outputPath, 0o775)
              })
            }
          }
        ]
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
    resolve: {
      extensions: ['.js']
    }
  }
}
