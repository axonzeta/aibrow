import IPCClient from '#Shared/IPC/IPCClient'
import ContentScriptPort from './ContentScriptPort'

const ipcClient = new IPCClient(new ContentScriptPort(), {
  // The port in the extension automatically reconnects after it's been destroyed
  // and there's no persisted state in the background page between different ports
  portReconnects: true
})

export default ipcClient
