import {
  AIRootModelProps
} from '#Shared/API/AI'

class AIRootModel {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #props: AIRootModelProps

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (props: AIRootModelProps) {
    this.#props = props
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get topK () { return this.#props.topK }

  get topP () { return this.#props.topP }

  get temperature () { return this.#props.temperature }

  get repeatPenalty () { return this.#props.repeatPenalty }

  get flashAttention () { return this.#props.flashAttention }

  get contextSize () { return this.#props.contextSize }
}

export default AIRootModel
