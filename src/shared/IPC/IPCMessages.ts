export enum IPCMessageType {
  clientOpen,
  clientAbort,
  clientPing,
  clientToolResult,
  serverResolve,
  serverReject,
  serverEmit,
  serverPong,
  serverAbort,
  serverToolCall
}

export type IPCMessage = {
  ipcType: IPCMessageType,
  id: string,
  payload: any
}

export type IPCOpenMessage = IPCMessage & {
  type: string
}
