import {
  AIModelCoreState
} from './AICoreTypes'
import {
  AIBrowExtensionHelperInstalledState
} from './AIBrowTypes'
import {
  AIRootModelProps,
  AIExtensionHelperInstalledState
} from '../API/AI'

//TODO: remove this

export function TRANS_AIModelCoreState_To_AIRootModelProps (state: AIModelCoreState): AIRootModelProps {
  return state as unknown as AIRootModelProps
}

export function TRANS_AIExtensionHelperInstalledState_To_AIBrow (state: AIExtensionHelperInstalledState): AIBrowExtensionHelperInstalledState {
  return state as unknown as AIBrowExtensionHelperInstalledState
}