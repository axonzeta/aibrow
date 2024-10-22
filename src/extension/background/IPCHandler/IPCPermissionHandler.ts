import {
  getSiteModelPermission as getSiteModelPermissionPref,
  SiteModelPermissionRequest
} from '#Shared/Permissions/AISitePermissions'
import { kGetPermissionRequests, kResolvePermissionRequest } from '#Shared/BackgroundAPI/PermissionIPC'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'
import PermissionProvider from '../PermissionProvider'

class IPCPermissionHandler {
  constructor () {
    IPCBackgroundMessager
      .addHandler(kGetPermissionRequests, ({ tabId }, sender, sendResponse) => {
        const requests = PermissionProvider.requests
          .queryForTab(tabId)
          .map(({ resolve, reject, ...rest }) => rest as SiteModelPermissionRequest)
        sendResponse(requests)
        return true
      })
      .addHandler(kResolvePermissionRequest, ({ origin, modelId }, sender, sendResponse) => {
        getSiteModelPermissionPref(origin, modelId).then((permission) => {
          permission = permission ?? false
          PermissionProvider.requests.resolveForOrigin(origin, modelId, permission)
          sendResponse(null)
        })

        return true
      })
  }
}

export default IPCPermissionHandler
