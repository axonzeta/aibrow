import APIHandlerFactory from './APIHandler/APIHandlerFactory'
import IPCHandler from './IPCHandler/IPCHandler'
import { NativeInstallHelper } from './NativeInstallHelper'
import System from './System'

// API Handlers
const apiHandlerFactory = new APIHandlerFactory() // eslint-disable-line @typescript-eslint/no-unused-vars
apiHandlerFactory.start()

// IPC helpers
const ipcHandler = new IPCHandler()
ipcHandler.start()

// Install helpers
NativeInstallHelper.start()

// Updates
System.backgroundCheckForNativeUpdates()
