const genericWindow = window as any
const Browser = {
  LanguageDetector: genericWindow.LanguageDetector,
  LanguageModel: genericWindow.LanguageModel,
  Rewriter: genericWindow.Rewriter,
  Summarizer: genericWindow.Summarizer,
  Translator: genericWindow.Translator,
  Writer: genericWindow.Writer
}

export default Browser
