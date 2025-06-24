import fs from 'fs-extra'
import path from 'path'

async function main () {
  await fs.remove(path.join(import.meta.dirname, '../out'))
  await fs.remove(path.join(import.meta.dirname, '../node_modules'))
}

main()
