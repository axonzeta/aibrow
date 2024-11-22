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
