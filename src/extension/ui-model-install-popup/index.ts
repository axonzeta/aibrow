import { kGetInflightInstallProgress } from '#Shared/BackgroundAPI/ManagementIPC'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'

import './index.less'

async function main () {
  const progress = await IPCBackgroundMessager.request(kGetInflightInstallProgress, { })
  await render(progress as any)

  if (await chrome.tabs.getCurrent()) {
    await chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {
      height: document.documentElement.scrollHeight + (window.outerHeight - window.innerHeight)
    })
  }

  setInterval(async () => {
    const progress = await IPCBackgroundMessager.request(kGetInflightInstallProgress, { })
    render(progress as any)
  }, 500)
}

async function render (progress: { inflight: boolean, progress: number | null, name: string } | null) {
  if (progress === null) {
    window.close()
    return
  }

  document.getElementById('model').textContent = progress.name
  document.getElementById('progress-status').textContent = progress.progress === null ? 'Loading...' : `${progress.progress}%`
  document.getElementById('progress-bar').style.width = progress.progress === null ? '0%' : `${progress.progress}%`
}

main()
