/**
 * This can be safely called multiple times
 */
function override () {
  const genericWindow = window as any
  if (genericWindow.aibrow) {
    genericWindow.ai = genericWindow.aibrow
  } else {
    if (genericWindow.ai) {
      genericWindow.ai.__aibrowOverride = true
    }
  }
  if (genericWindow.aibrowTranslation) {
    genericWindow.translation = genericWindow.aibrowTranslation
  } else {
    if (genericWindow.translation) {
      genericWindow.translation.__aibrowOverride = true
    }
  }
}

override()

// <meta http-equiv="origin-trial" headers in the dom may not have been parsed at this point, so we have
// to wait for document.head to be available and then override otherwise the browser implementation
// will be injected back over the top.
//
// This can be removed when the origin trials have finished, around M136
if (!document.head) {
  const observer = new MutationObserver(() => {
    if (document.head) {
      observer.disconnect()
      override()
    }
  })
  observer.observe(document.documentElement, { childList: true })
}
