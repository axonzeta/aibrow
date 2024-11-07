import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv)).version(false).options({
  install: { type: 'boolean', default: false },
  model: { type: 'string' },
  version: { type: 'boolean', default: false },
  ai_test: { type: 'boolean', default: false },
  check: { type: 'boolean', default: false }
}).parseSync()

export default argv
