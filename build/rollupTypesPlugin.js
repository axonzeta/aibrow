import path from 'path'
import fs from 'fs-extra'
import childProcess from 'child_process'

/**
 * Creates typescript typings using rollup
 * @param inputPath: the input file
 * @param configPath: the rollup config file
 * @param outputPath: the output file
 */
export default function rollupTypesPlugin (
  inputPath,
  configPath,
  outputPath
) {
  return {
    apply: (compiler) => {
      compiler.hooks.afterEmit.tapAsync('rollup-types-plugin', async (compilation, callback) => {
        try {
          // Build the definitions
          await new Promise((resolve, reject) => {
            const child = childProcess.spawn('npx', [
              'rollup',
              '--config', path.basename(configPath), // './types-rollup.config.js',
              '--input', inputPath,
              '--format es',
              '--file', outputPath
            ], {
              shell: true, stdio: 'inherit', detatched: true, cwd: path.dirname(configPath)
            })
            child.on('close', (code) => {
              if (code === 0) {
                resolve()
              } else {
                reject(new Error(`Failed to run rollup with exit code ${code}`))
              }
            })
            child.on('error', (err) => {
              reject(new Error(`Rollup failed to generate types ${err}`))
            })
          })

          await fs.writeJSON(path.join(path.dirname(outputPath), 'tsconfig.json'), {
            compilerOptions: {
              module: 'node16',
              lib: ['es6'],
              noImplicitAny: true,
              noImplicitThis: true,
              strictFunctionTypes: true,
              strictNullChecks: true,
              types: [],
              noEmit: true,
              forceConsistentCasingInFileNames: true
            },
            files: [
              path.basename(outputPath)
            ]
          }, { spaces: 2 })

          callback()
        } catch (ex) {
          compilation.errors.push(ex)
          callback()
        }
      })
    }
  }
}
