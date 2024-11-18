const genericWindow = window as any
if (genericWindow.aibrow) {
  genericWindow.ai = genericWindow.aibrow
} else {
  console.warn('aibrow not found')
}
if (genericWindow.aibrowTranslation) {
  genericWindow.translation = genericWindow.aibrowTranslation
} else {
  console.warn('aibrowTranslation not found')
}
