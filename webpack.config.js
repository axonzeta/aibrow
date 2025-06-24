import path from 'path'
import fs from 'fs-extra'
import webpack from 'webpack'
import extensionConfig from './src/extension/webpack.config.js'
import extensionLibraryConfig from './src/extension-library/webpack.config.js'
import nativeConfig from './src/native/webpack.config.js'
import webLibraryConfig from './src/web-library/webpack.config.js'

const pkg = fs.readJsonSync(path.join(import.meta.dirname, 'package.json'))
const pkgLock = fs.readJsonSync(path.join(import.meta.dirname, 'package-lock.json'))
const config = fs.readJsonSync(path.join(import.meta.dirname, 'config.json'))

const registry = {
  extension: extensionConfig,
  'extension-library': extensionLibraryConfig,
  native: nativeConfig,
  'web-library': webLibraryConfig
}

export default async function (env, args) {
  const taskInput = env.task ? env.task.split(',') : ['all']
  const taskIds = taskInput.includes('all') ? Object.keys(registry) : taskInput
  const taskConfig = {
    outDir: path.join(import.meta.dirname, 'out'),
    nodeModulesDir: path.join(import.meta.dirname, 'node_modules'),
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
