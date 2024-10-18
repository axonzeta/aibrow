function messageAzExtension (message: any, reply: (err: chrome.runtime.LastError | null, reply: string) => void) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      reply(chrome.runtime.lastError, null)
    } else {
      reply(null, JSON.stringify(response))
    }
  })
}
// @ts-expect-error Cannot find name exportFunction
exportFunction(messageAzExtension, window, {
  defineAs: 'messageAzExtension'
})
