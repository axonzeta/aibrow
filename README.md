AiBrow is a browser extension that brings AI to your device. It uses small language models on your machine, making it fast and keeping your data private. With AiBrow, you can complete sentences, improve your writing, rephrase text, or sum up complex information using the latest small LLMs such as Llama 3.2, Phi 3.5, Gemma 2 and Qwen 2.5.

The development API follows the current proposal for the browser [Prompt API](https://github.com/explainers-by-googlers/prompt-api?tab=readme-ov-file#stakeholder-feedback) in development within [Chrome](https://developer.chrome.com/docs/ai/built-in). It uses [llama.cpp](https://github.com/ggerganov/llama.cpp) as the inference engine and supports the use of grammar schemas and LoRA Adapters.

The extension works on all Chromium based browsers as well as Firefox.

* [Docs](https://docs.aibrow.ai/)
* [API Reference](https://docs.aibrow.ai/api-reference/aibrow)
* [Playground](https://demo.aibrow.ai/playground/)

## How can I try AiBrow?

The easiest way is to download through the Chrome Web Store or Mozilla add-on store. If you want to try the latest version, you can also install the developer version of the extension

### Chrome & Chromium based browsers

1. Open the [Releases](https://github.com/axonzeta/aibrow/releases/new) page, download the latest `crx.zip`, then extract it on disk
2. Open `chrome://extensions` in a new tab and turn on the developer tools
3. Click the `Load unpacked` button and locate extracted folder
4. [Try out the playground](https://demo.aibrow.ai/playground/)

### Firefox

1. Open the [Releases](https://github.com/axonzeta/aibrow/releases/new) page, download the latest `moz.zip`, then extract it on disk
2. Open `about:debugging#/runtime/this-firefox`
3. Click the `Load temporary Add-on`
4. [Try out the playground](https://demo.aibrow.ai/playground/)

## How can I use the AiBrow API?

### Website

AiBrow embeds itself to the page using the `window.aibrow` namespace (also `window.ai` if it's not already available). Check out our [developer docs](https://docs.aibrow.ai/) on how to get started!

```js
if (window.aibrow) {
  const { helper } = await window.aibrow.capabilities()
  if (helper) {
    const session = await window.aibrow.languageModel.create()
    const stream = await sess.promptStreaming('Write a poem about AI in the browser')
    for await (const chunk of stream) {
      console.log(chunk)
    }
  } else {
    console.log('Aibrow helper not installed')
  }
} else {
  console.log('Aibrow not installed')
}
```

### Extension

Install the library using `npm install @aibrow/extension`

```js
import aibrow from '@aibrow/extension'

const { helper, extension } = await window.aibrow.capabilities()
if (extension) {
  if (helper) {
    const session = await window.aibrow.languageModel.create()
    const stream = await sess.promptStreaming('Write a poem about AI in the browser')
    for await (const chunk of stream) {
      console.log(chunk)
    }
  } else {
    console.log('Aibrow helper not installed')
  }
} else {
  console.log('Aibrow not installed')
}
```

## How can I build AiBrow myself?

1. `npm run watch` or `npm start` to build the extension
2. Run `out/native/boot.cjs --install` to install the native manifest hooks
3. Install the extension from `out/extension` into the browser
4. Logs from the native binary are available in `out/native/aibrow.log`


## Examples

1. `cd examples`
1. `npm start`
