import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CircularDependencyPlugin from 'circular-dependency-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import { pathsToWebpackAlias } from '../../build/tsconfig_util.js'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import rollupTypesPlugin from '../../build/rollupTypesPlugin.js'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import http from 'http'
import fs from 'fs-extra'
import mime from 'mime-types'
import sanitizeFilename from 'sanitize-filename'
import webpack from 'webpack'

class WebLibraryFrameServePlugin {
  constructor (outPath, port, watch) {
    this.name = 'WebLibraryFrameServePlugin'
    this.server = null
    this.outPath = outPath
    this.port = port
    this.watch = watch
  }

  apply (compiler) {
    const logger = compiler.getInfrastructureLogger(this.name)
    compiler.hooks.afterCompile.tapAsync(this.name, (compilation, callback) => {
      try {
        if (!this.watch) {
          logger.warn(
            `The web-library uses an iframe for shared model caching. This frame needs to be served
from a url in development mode. To do this, either:

1. Quit webpack and instead use: npm run watch
2. Run your own http server with something like: http-server -c-1 ${this.outPath} -p ${this.port}`)
          return
        }
        if (this.server) {
          return
        }

        logger.info(`Shared frame served from: http://localhost:${this.port}`)
        this.server = http.createServer(async (req, res) => {
          // We only support 1-deep paths, so this is fine to strip any slashes
          const urlPath = sanitizeFilename(new URL(req.url, `http://localhost:${this.port}`).pathname)
          let filePath = path.join(this.outPath, urlPath)

          try {
            if ((await fs.stat(filePath)).isDirectory()) {
              filePath = path.join(filePath, 'index.html')
            }
            const fileData = await fs.readFile(filePath)
            const ext = path.parse(filePath).ext
            res.setHeader('Content-type', mime.lookup(ext) || 'text/plain')
            res.end(fileData)
          } catch (ex) {
            if (ex.message.startsWith('ENOENT')) {
              res.writeHead(404)
              res.end('Not found')
            } else {
              res.writeHead(500)
              res.end('Internal server error')
            }
          }
        }).listen(this.port)
      } finally {
        callback()
      }
    })
  }
}

export default async function ({ outDir, nodeModulesDir, pkg, config, env }, { mode }) {
  const framePort = await (await import('get-port')).default({ port: 63779 })
  const urlJoin = (await import('url-join')).default
  return ['library', 'frame'].map((component) => {
    const srcDir = import.meta.dirname

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
            path.join(import.meta.dirname, 'types-rollup.config.js'),
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
          }),
          new webpack.DefinePlugin({
            'process.env.AZ_WEB_FRAME_URL': JSON.stringify(mode === 'development'
              ? `http://localhost:${framePort}`
              : urlJoin(config.webLibrary.modelHelper.production.baseUrl, pkg.version, 'index.html')
            )
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
          }),
          ...(mode === 'development'
            ? [new WebLibraryFrameServePlugin(path.join(outDir, 'web-library-frame'), framePort, env.WEBPACK_WATCH === true)]
            : []
          )
        ]
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
        new MiniCssExtractPlugin(),

        // @huggingface/transformers imports a few node things, which normally fails,
        // but we need to tell webpack not to try to resolve them
        new webpack.IgnorePlugin({
          resourceRegExp: /(^node:)|(.node$)/
        })
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
