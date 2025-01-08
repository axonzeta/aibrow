const path = require('path')
const pkg = require('./package.json')
const pkgLock = require('./package-lock.json')
const config = require('./config.json')
const webpack = require('webpack')
const fs = require('fs-extra')

const registry = {
  extension: require('./src/extension/webpack.config.cjs'),
  'extension-library': require('./src/extension-library/webpack.config.cjs'),
  native: require('./src/native/webpack.config.cjs'),
  'web-library': require('./src/web-library/webpack.config.cjs')
}

module.exports = async function (env, args) {
  const taskInput = env.task ? env.task.split(',') : ['all']
  const taskIds = taskInput.includes('all') ? Object.keys(registry) : taskInput
  const taskConfig = {
    outDir: path.join(__dirname, 'out'),
    nodeModulesDir: path.join(__dirname, 'node_modules'),
    env,
    pkg,
    pkgLock,
    config
  }
  const taskArgs = {
    mode: ['production', 'development'].includes(args.mode) ? args.mode : 'development'
  }

  const allTasks = []
  for (const taskId of taskIds) {
    if (!registry[taskId]) {
      throw new Error(`Unknown task: ${taskId}`)
    }
    const taskOutput = await registry[taskId](taskConfig, taskArgs)
    const subtasks = Array.isArray(taskOutput) ? taskOutput : [taskOutput]
    for (const task of subtasks) {
      allTasks.push({
        ...task,
        plugins: [
          ...(task.plugins ?? []),
          new webpack.DefinePlugin({
            'process.env.AZ_CONFIG': JSON.stringify({ version: pkg.version, ...config }),
            'process.env.AZ_VERSION': JSON.stringify(pkg.version),
            ...env.AZ_UPDATE_PUBLIC_KEY
              ? { 'process.env.AZ_UPDATE_PUBLIC_KEY': JSON.stringify(fs.readFileSync(env.AZ_UPDATE_PUBLIC_KEY, 'utf8')) }
              : undefined
          })
        ]
      })
    }
  }

  return allTasks
}
