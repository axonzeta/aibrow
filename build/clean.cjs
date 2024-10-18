const fs = require('fs-extra')
const path = require('path')

async function main () {
  await fs.remove(path.join(__dirname, '../out'))
  await fs.remove(path.join(__dirname, '../node_modules'))
}

main()
