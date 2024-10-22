import {
  getSiteModelPermission as getSiteModelPermissionPref
} from '#Shared/Permissions/AISitePermissions'
import { kGetPermissionRequests, kResolvePermissionRequest } from '#Shared/BackgroundAPI/PermissionIPC'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'
import PermissionProvider from '../PermissionProvider'

class IPCManagementHandler {
  constructor () {
    IPCBackgroundMessager
      .addHandler(kGetPermissionRequests, ({ tabId }, sender, sendResponse) => {
        const requests = PermissionProvider.getForTab(tabId)
        sendResponse(requests)
        return true
      })
      .addHandler(kResolvePermissionRequest, ({ origin, modelId }, sender, sendResponse) => {
        getSiteModelPermissionPref(origin, modelId).then((permission) => {
          permission = permission ?? false
          PermissionProvider.resolveForOrigin(sender?.tab?.id, origin, modelId, permission)
          sendResponse(null)
        })

        return true
      })
  }
}

export default IPCManagementHandler
