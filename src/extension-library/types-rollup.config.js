import path from 'path'
import dts from 'rollup-plugin-dts'
import { typescriptPaths } from 'rollup-plugin-typescript-paths'

export default [{
  plugins: [
    typescriptPaths({
      tsConfigPath: path.join(import.meta.dirname, 'tsconfig.json'),
      absolute: false,
      preserveExtensions: true,
      transform: (p) => {
        return process.platform === 'win32' && p.startsWith('.\\C:\\')
          ? p.slice(2)
          : path.resolve('/', p)
      }
    }),
    dts()
  ]
}]
