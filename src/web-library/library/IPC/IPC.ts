import IPCClient from '#Shared/IPC/IPCClient'
import FramePort from './FramePort'

const ipcClient = new IPCClient(new FramePort(), {
  // The port in contentscript-main automatically reconnects after it's been destroyed
  // and there's no persisted state in the background page between different ports
  portReconnects: true
})

export default ipcClient
