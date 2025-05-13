import APIHandlerFactory from './APIHandler/APIHandlerFactory'
import BrowserAction from './BrowserAction'
import IPCHandler from './IPCHandler/IPCHandler'
import { NativeInstallHelper } from './NativeInstallHelper'
import System from './System'

// API Handlers
const api2HandlerFactory = new APIHandlerFactory()
api2HandlerFactory.start()

// IPC helpers
const ipcHandler = new IPCHandler()
ipcHandler.start()

// Components
NativeInstallHelper.start()
BrowserAction.start()

// Updates
System.backgroundCheckForNativeUpdates()
