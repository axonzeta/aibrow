/* **************************************************************************/
// MARK: Core capabilities: Extension
/* **************************************************************************/

export enum AIBrowExtensionHelperInstalledState {
  Responded = 'responded',
  RespondedOutdated = 'responded-outdated',
  Errored = 'errored',
  NotInstalled = 'not-installed'
}

export type AIBrowCapabilities = {
  ready: boolean
}

export type AIBrowExtensionCapabilities = {
  extension: boolean
  helper: boolean
  helperState: AIBrowExtensionHelperInstalledState
} & AIBrowCapabilities

export type AIBrowWebCapabilities = {
  gpu: boolean
  cpu: boolean
} & AIBrowCapabilities
