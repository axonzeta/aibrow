import Logger from './Logger'
import Argv from './Argv'
import config from '#Shared/Config'
import AIModelFileSystem from './AI/AIModelFileSystem'
import { importLlama } from './Llama'
import * as Installer from './Installer/Installer'
import * as Updater from './Installer/Updater'
import APIHandler from './APIHandler'

/* **************************************************************************/
// MARK: Launch
/* **************************************************************************/

function hasExtensionArg () {
  const args = new Set(Argv._)
  for (const id of config.extension.crxExtensionIds) {
    if (args.has(`chrome-extension://${id}/`)) {
      return true
    }
  }

  for (const id of config.extension.mozExtensionIds) {
    if (args.has(id)) {
      return true
    }
  }

  return false
}

async function main () {
  process.on('unhandledRejection', (reason: Error | string) => {
    if (reason instanceof Error) {
      Logger.logImmediately(`Unhandled Rejection: ${reason.message}\nException origin: ${reason.stack}`)
    } else {
      Logger.logImmediately(`Unhandled Rejection: ${reason}`)
    }
  })

  process.on('uncaughtException', (error: Error) => {
    Logger.logImmediately(`Uncaught exception: ${error}\nException origin: ${error.stack}`)
  })

  Logger.log('Starting', process.pid, config.version, process.execPath)

  if (Argv.version) {
    Logger.log('Starting: version')
    Logger.logToConsole = true
    console.log(config.version)
    process.exit(0)
  } else if (Argv.install) {
    Logger.log('Starting: install')
    Logger.logToConsole = true
    await Installer.install()
    if (Argv.model) {
      await Installer.installLocalModel(Argv.model)
    }
    process.exit(0)
  } else if (Argv.ai_test) {
    Logger.log('Starting: ai_test')
    Logger.logToConsole = true

    const modelName = config.defaultAiModel

    if (!await AIModelFileSystem.hasModel(modelName)) {
      Logger.log('Model not available')
      process.exit(-1)
    }

    const { getLlama, LlamaChatSession } = await importLlama()
    const llama = await getLlama({ build: 'never' })
    const model = await llama.loadModel({
      modelPath: await AIModelFileSystem.getLLMPath(modelName)
    })
    const context = await model.createContext({})
    const session = new LlamaChatSession({
      contextSequence: context.getSequence()
    })

    const reply = await session.prompt('Write a short poem about AI', {
      onTextChunk (chunk) { Logger.log(chunk) }
    })
    Logger.log(reply)
    process.exit(0)
  } else if (Argv.check) {
    Logger.log('Starting: check')
    Logger.logToConsole = true
    const updateResult = await Updater.update(/* config */undefined, /* dry */ true)
    Logger.log(`OK: ${updateResult}`)
    process.exit(0)
  } else {
    Logger.log('Starting: extension')
    if (!hasExtensionArg()) {
      Logger.error('Missing extension id argument')
      await Logger.awaitQueueDrain()
      process.exit(1)
    }

    process.on('exit', (code) => {
      Logger.logImmediately('Exiting', process.pid, code)
    })

    APIHandler.start()

    // Run any install steps and cleanup old installs
    ;(async () => {
      await Installer.cleanup()
    })()
  }
}

main()
