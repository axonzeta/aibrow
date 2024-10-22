import { IPCBackgroundMessager, IPCSendResponseFn } from '#Shared/IPC/IPCBackgroundMessager'
import {
  kGetInstalledModels,
  kUninstallModel,
  kUpdateNativeBinary,
  kGetInfo,
  kGetSupportedGpuEngines,
  kGetInflightInstallProgress
} from '#Shared/BackgroundAPI/ManagementIPC'
import AIPrompter from '../AI/AIPrompter'
import { AIModelManager, TaskType as AIModelManagerTaskType } from '../AI/AIModelManager'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import System from '../System'

class IPCManagementHandler {
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
      .addHandler(kGetInflightInstallProgress, (message: any, sender: chrome.runtime.MessageSender, sendResponse: IPCSendResponseFn) => {
        const task = AIModelManager.inflightTask
        if (task.running && task.type === AIModelManagerTaskType.Install) {
          sendResponse({
            running: true,
            progress: task.progress,
            name: task.state?.name
          })
        } else {
          sendResponse(null)
        }
        return true
      })
  }
}

export default IPCManagementHandler
