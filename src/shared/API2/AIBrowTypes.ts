/* **************************************************************************/
// MARK: Core capabilities: Extension
/* **************************************************************************/

export enum AIBrowExtensionHelperInstalledState {
  Responded = 'responded',
  RespondedOutdated = 'responded-outdated',
  Errored = 'errored',
  NotInstalled = 'not-installed'
}

export type AIBrowExtensionCapabilities = {
  extension: boolean
  helper: boolean
  helperState: AIBrowExtensionHelperInstalledState
  ready: boolean
}
