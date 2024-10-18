const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = function (env, args) {
  const outDir = path.join(__dirname, '../out')
  const nodeModulesDir = path.join(__dirname, 'node_modules')

  return ['site', 'extension'].map((target) => {
    const srcDir = path.join(__dirname, target)
    let entry
    let copyPatterns
    switch (target) {
      case 'site':
        entry = { index: path.join(srcDir, 'index.cjs') }
        copyPatterns = [{ from: path.join(srcDir, 'index.html'), to: 'index.html', force: true }]
        break
      case 'extension':
        entry = { background: path.join(srcDir, 'background.cjs'), sidepanel: path.join(srcDir, 'sidepanel.cjs') }
        copyPatterns = [
          { from: path.join(srcDir, 'sidepanel.html'), to: 'sidepanel.html', force: true },
          { from: path.join(srcDir, 'manifest.json'), to: 'manifest.json', force: true }
        ]
        break
    }

    return {
      entry,
      output: {
        filename: '[name].js',
        path: path.join(outDir, 'demo', target)
      },
      devtool: 'source-map',
      plugins: [
        new CleanWebpackPlugin(),
        new CaseSensitivePathsPlugin(),
        new CircularDependencyPlugin({ exclude: /node_modules/, failOnError: true, allowAsyncCycles: false }),
        new CopyWebpackPlugin({ patterns: copyPatterns })
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
        extensions: ['.cjs', '.js', '.json']
      }
    }
  })
}
