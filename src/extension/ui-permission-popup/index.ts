import { setSiteModelPermission, SiteModelPermissionRequest } from '#Shared/Permissions/AISitePermissions'
import { kGetPermissionRequests, kResolvePermissionRequest } from '#Shared/BackgroundAPI/PermissionIPC'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'
import config from '#Shared/Config'

import './index.less'

async function main () {
  const qs = new URLSearchParams(window.location.search)
  const tabId = parseInt(qs.get('tabId'))
  if (!tabId || isNaN(tabId)) {
    window.close()
    return
  }

  const requests = await IPCBackgroundMessager.request(kGetPermissionRequests, { tabId }) as SiteModelPermissionRequest[]
  if (!requests.length) {
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
    //twbtwb
    if (process.env.BROWSER === 'moz' && config.extension.experimentalFirefoxAi) {
      await (globalThis.browser as any).permissions.request({ permissions: ['trialML'] })
    }

    await setSiteModelPermission(request.origin, request.modelId, true)
    IPCBackgroundMessager.send(kResolvePermissionRequest, request)
    window.close()
  })
  document.getElementById('action-deny').addEventListener('click', async () => {
    await setSiteModelPermission(request.origin, request.modelId, false)
    IPCBackgroundMessager.send(kResolvePermissionRequest, request)
    window.close()
  })
  document.getElementById('action-close').addEventListener('click', () => {
    window.close()
  })

  if (await chrome.tabs.getCurrent()) {
    await chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {
      height: document.documentElement.scrollHeight + (window.outerHeight - window.innerHeight)
    })
  }
}

main()
