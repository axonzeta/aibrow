import APIHandlerFactory from './APIHandler/APIHandlerFactory'
import BrowserAction from './BrowserAction'
import IPCHandler from './IPCHandler/IPCHandler'
import { NativeInstallHelper } from './NativeInstallHelper'
import System from './System'

// API Handlers
const apiHandlerFactory = new APIHandlerFactory() // eslint-disable-line @typescript-eslint/no-unused-vars
apiHandlerFactory.start()

// IPC helpers
const ipcHandler = new IPCHandler()
ipcHandler.start()

// Components
NativeInstallHelper.start()
BrowserAction.start()

// Updates
System.backgroundCheckForNativeUpdates()
