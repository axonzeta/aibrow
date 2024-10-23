const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = function ({ outDir, nodeModulesDir }, { mode }) {
  const srcDir = __dirname

  return {
    entry: {
      background: path.join(srcDir, 'background.cjs'),
      sidepanel: path.join(srcDir, 'sidepanel.cjs')
    },
    output: {
      filename: '[name].js',
      path: path.join(outDir, 'demo-extension')
    },
    devtool: mode === 'development' ? 'inline-cheap-source-map' : 'source-map',
    plugins: [
      new CleanWebpackPlugin(),
      new CaseSensitivePathsPlugin(),
      new CircularDependencyPlugin({
        exclude: /node_modules/,
        failOnError: true,
        allowAsyncCycles: false
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.join(srcDir, 'sidepanel.html'), to: 'sidepanel.html', force: true },
          { from: path.join(srcDir, 'manifest.json'), to: 'manifest.json', force: true }
        ]
      })
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
        }
      ]
    },
    resolve: {
      extensions: [
        '.cjs',
        'js',
        '.json'
      ]
    },
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
    }
  }
}
