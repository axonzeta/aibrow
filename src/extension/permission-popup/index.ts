import { setSiteModelPermission, SiteModelPermissionRequest } from '#Shared/Permissions/AISitePermissions'
import { kGetPermissionRequests, kResolvePermissionRequest } from '#Shared/BackgroundAPI/PermissionIPC'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'

import './index.less'

function clearPopup (tabId: number) {
  chrome.action.setPopup({ popup: '', tabId })
  chrome.action.setBadgeText({ text: '', tabId })
}

async function main () {
  const qs = new URLSearchParams(window.location.search)
  const tabId = parseInt(qs.get('tabId'))
  if (!tabId || isNaN(tabId)) {
    window.close()
    return
  }

  const requests = await IPCBackgroundMessager.request(kGetPermissionRequests, { tabId }) as SiteModelPermissionRequest[]
  if (!requests.length) {
    clearPopup(tabId)
    window.close()
    return
  }

  const request = requests[0]

  document.getElementById('origin').textContent = request.origin
  document.getElementById('model').textContent = request.modelName
  if (request.modelLicenseUrl) {
    document.getElementById('license').style.visibility = 'visible'
    ;(document.getElementById('license-link') as HTMLAnchorElement).href = request.modelLicenseUrl
  } else {
    document.getElementById('license').style.visibility = 'hidden'
  }

  document.getElementById('action-allow').addEventListener('click', async () => {
    await setSiteModelPermission(request.origin, request.modelId, true)
    IPCBackgroundMessager.send(kResolvePermissionRequest, request)
    clearPopup(tabId)
    window.close()
  })
  document.getElementById('action-deny').addEventListener('click', async () => {
    await setSiteModelPermission(request.origin, request.modelId, false)
    IPCBackgroundMessager.send(kResolvePermissionRequest, request)
    clearPopup(tabId)
    window.close()
  })
  document.getElementById('action-close').addEventListener('click', () => {
    IPCBackgroundMessager.send(kResolvePermissionRequest, request)
    clearPopup(tabId)
    window.close()
  })
}

main()
