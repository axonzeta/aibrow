export enum UpdateResult {
  Updated = 'updated',
  NoUpdate = 'no_update',
  NetworkError = 'network_error',
  SignatureError = 'signature_error',
  Error = 'error'
}

const kUpdatePublicKey = globalThis.process
  ? (process.env as any).AZ_UPDATE_PUBLIC_KEY as string
  : undefined
export { kUpdatePublicKey }
