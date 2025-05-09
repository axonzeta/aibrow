import { AIModelCoreState } from './AICoreTypes'
import { AIRootModelProps } from '../API/AI'

//TODO: remove this

export function TRANS_AIModelCoreState_To_AIRootModelProps (state: AIModelCoreState): AIRootModelProps {
  return state as unknown as AIRootModelProps
}
