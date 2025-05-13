/**
 * This can be safely called multiple times
 */
function override () {
  const genericWindow = window as any
  if (genericWindow.aibrow && typeof (genericWindow.aibrow.overrideBrowserAPI) === 'function') {
    genericWindow.aibrow.overrideBrowserAPI(true)
  } else {
    genericWindow.__aibrowOverride = true
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
