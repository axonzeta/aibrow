const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const autoprefixer = require('autoprefixer')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = function (env, args) {
  const outDir = path.join(__dirname, '../out')
  const nodeModulesDir = path.join(__dirname, 'node_modules')

  return ['playground', 'extension'].map((target) => {
    const srcDir = path.join(__dirname, target)
    const targetOutDir = path.join(outDir, 'examples', target)
    let entry
    let plugins
    let devServer
    switch (target) {
      case 'playground':
        entry = { index: path.join(srcDir, 'index.js') }
        plugins = [
          new HtmlWebpackPlugin({ template: path.join(srcDir, 'index.html') })
        ]
        devServer = {
          static: targetOutDir,
          hot: true
        }
        break
      case 'extension':
        entry = { background: path.join(srcDir, 'background.cjs'), sidepanel: path.join(srcDir, 'sidepanel.cjs') }
        plugins = [
          new CopyWebpackPlugin({
            patterns: [
              { from: path.join(srcDir, 'sidepanel.html'), to: 'sidepanel.html', force: true },
              { from: path.join(srcDir, 'manifest.json'), to: 'manifest.json', force: true }
            ]
          })
        ]
        break
    }

    return {
      entry,
      output: {
        filename: '[name].js',
        path: targetOutDir
      },
      devtool: 'source-map',
      devServer,
      plugins: [
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
        ...plugins
      ],
      module: {
        rules: [
          {
            test: /(\.js|\.cjs)$/,
            use: { loader: 'babel-loader' },
            exclude: [path.resolve(nodeModulesDir)],
            include: [
              path.resolve(srcDir)
            ]
          },
          {
            test: /\.(scss)$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              {
                loader: 'postcss-loader',
                options: {
                  postcssOptions: {
                    plugins: [autoprefixer]
                  }
                }
              },
              {
                loader: 'sass-loader',
                options: {
                  sassOptions: { quietDeps: true }
                }
              }
            ]
          }
        ]
      },
      resolve: {
        extensions: [
          '.cjs',
          '.js',
          '.json'
        ]
      },
      optimization: {
        runtimeChunk: 'single'
      }
    }
  })
}
