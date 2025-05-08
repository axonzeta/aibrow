import APIHandlerFactory from './APIHandler/APIHandlerFactory'
import API2HandlerFactory from './API2Handler/APIHandlerFactory'
import BrowserAction from './BrowserAction'
import IPCHandler from './IPCHandler/IPCHandler'
import { NativeInstallHelper } from './NativeInstallHelper'
import System from './System'

// API Handlers
const apiHandlerFactory = new APIHandlerFactory()
apiHandlerFactory.start()

const api2HandlerFactory = new API2HandlerFactory()
api2HandlerFactory.start()

// IPC helpers
const ipcHandler = new IPCHandler()
ipcHandler.start()

// Components
NativeInstallHelper.start()
BrowserAction.start()

// Updates
System.backgroundCheckForNativeUpdates()
