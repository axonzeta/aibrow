import { IPCBackgroundMessager, IPCSendResponseFn } from '#Shared/IPC/IPCBackgroundMessager'
import {
  kGetInstalledModels,
  kUninstallModel,
  kUpdateNativeBinary,
  kGetInfo,
  kGetSupportedGpuEngines
} from '#Shared/BackgroundAPI/ManagementIPC'
import AIPrompter from '../AI/AIPrompter'
import AIModelManager from '../AI/AIModelManager'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import System from '../System'

class IPCPermissionHandler {
  constructor () {
    IPCBackgroundMessager
      .addHandler(kGetInstalledModels, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        AIModelFileSystem.getInstalledModels(message.stats === true).then((res) => sendResponse(res))
        return true
      })
      .addHandler(kUninstallModel, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        AIModelManager.uninstall(message.model).then(() => sendResponse(undefined))
        return true
      })
      .addHandler(kUpdateNativeBinary, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        System.checkForNativeUpdates().then((res) => sendResponse(res))
        return true
      })
      .addHandler(kGetInfo, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        System.getNativeInfo().then((res) => sendResponse(res))
        return true
      })
      .addHandler(kGetSupportedGpuEngines, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        AIPrompter.getSupportedGpuEngines().then((gpuEngines) => sendResponse(gpuEngines))
        return true
      })
  }
}

export default IPCPermissionHandler
