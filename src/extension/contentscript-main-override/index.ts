const genericWindow = window as any
if (genericWindow.aibrow) {
  genericWindow.ai = genericWindow.aibrow
} else {
  throw new Error('aibrow not found')
}
if (genericWindow.aibrowTranslation) {
  genericWindow.translation = genericWindow.aibrowTranslation
} else {
  throw new Error('aibrowTranslation not found')
}
