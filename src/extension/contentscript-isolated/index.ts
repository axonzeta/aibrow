import {
  kContentScriptMessageChannel,
  kContentScriptDisconnectChannel,
  kContentScriptPortName
} from '#Shared/IPC/ContentScriptIPC'

let port: chrome.runtime.Port | undefined

window.addEventListener('message', (evt) => {
  if (evt.source !== window) { return }
  let data: any
  try {
    data = JSON.parse(evt.data)
  } catch (ex) { return }
  if (data.channel !== kContentScriptMessageChannel) { return }

  if (!port) {
    port = chrome.runtime.connect({ name: kContentScriptPortName })
    port.onDisconnect.addListener(() => {
      port = undefined
      window.postMessage(JSON.stringify({ channel: kContentScriptDisconnectChannel }), '*')
    })
    port.onMessage.addListener((message) => {
      window.postMessage(JSON.stringify({ channel: kContentScriptMessageChannel, message }), '*')
    })
  }

  port.postMessage(data.message)
})
