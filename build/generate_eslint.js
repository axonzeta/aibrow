import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'

/* **************************************************************************/
// MARK: Paths
/* **************************************************************************/

const rootDir = path.resolve(import.meta.dirname, '..')
const srcDir = path.join(rootDir, 'src')

/* **************************************************************************/
// MARK: Helpers
/* **************************************************************************/

/**
 * Writes the config to disk
 * @param configDir: the config directory to write to
 * @param config: the config to write
 */
async function writeConfig (configDir, config) {
  const configJs = `/* eslint-disable */
// This file is automatically generated by generate_eslint.js

module.exports = ${JSON.stringify(config, null, 2)}
  `
  const configPath = path.join(configDir, '.eslintrc.cjs')
  await fs.writeFile(configPath, configJs)
  console.log(colors.green(`Generated ${path.relative(rootDir, configPath)}`))
}

/**
 * Merges the env into the override config
 * @param config: the config to merge into
 * @param env: the new env
 * @returns the updated config
 */
function mergeEnv (config, env) {
  return {
    ...config,
    env: { ...config.env, ...env }
  }
}

/* **************************************************************************/
// MARK: Configs
/* **************************************************************************/

const jsEslint = {
  files: ['*.{js,cjs}', '**/*.{js,cjs}', '*.{ts,tsx}', '**/*.{ts,tsx}'],
  parser: '@babel/eslint-parser',
  extends: [
    'eslint:recommended',
    'standard'
  ],
  env: {
    node: true
  }
}

const tsEslint = {
  files: ['*.{ts,tsx}', '**/*.{ts,tsx}'],
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, caughtErrors: 'none' }],
    '@stylistic/quotes': ['error', 'single'],
    '@stylistic/spaced-comment': ['error', 'always']
  },
  plugins: [
    '@typescript-eslint',
    '@stylistic'
  ]
}

/* **************************************************************************/
// MARK: Tasks
/* **************************************************************************/

await writeConfig(rootDir, {
  root: true,
  overrides: [jsEslint, tsEslint]
})
await writeConfig(path.join(srcDir, 'extension'), {
  root: true,
  overrides: [jsEslint, mergeEnv(tsEslint, { browser: true })]
})
await writeConfig(path.join(srcDir, 'extlib'), {
  root: true,
  overrides: [jsEslint, mergeEnv(tsEslint, { browser: true })]
})
await writeConfig(path.join(srcDir, 'native/main'), {
  root: true,
  overrides: [jsEslint, mergeEnv(tsEslint, { node: true })]
})
