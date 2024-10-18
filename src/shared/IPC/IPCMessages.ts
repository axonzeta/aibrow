export enum IPCMessageType {
  clientOpen,
  clientAbort,
  clientPing,
  serverResolve,
  serverReject,
  serverEmit,
  serverPong,
  serverAbort
}

export type IPCMessage = {
  ipcType: IPCMessageType,
  id: string,
  payload: any
}

export type IPCOpenMessage = IPCMessage & {
  type: string
}
