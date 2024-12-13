import type AIBrow from '@aibrow/dom-types'

declare global {
  interface Window {
    readonly aibrow: typeof AIBrow;
  }
}

export default window.aibrow
