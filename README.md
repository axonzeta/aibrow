<h1 align="center">
<sub>
<img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/aibrow-icon.png?raw=true" height="38" width="38">
</sub>
AiBrow: Bringing Local AI to your Browser.
</h1>

***

<p align="center">
<a href="https://chromewebstore.google.com/detail/aibrow/bbkbjiehfkggfkbampigbbakecijicdm"><img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/chrome_webstore_icon.png?raw=true" alt="Get AiBrow for Chrome" /></a><br/>
<a href="#firefox"><img src="" alt="Get AiBrow for Firefox"></a>
</p>

***

[![Step by step install](https://img.youtube.com/vi/sbcCsT9Ab9U/0.jpg?1)](https://www.youtube.com/watch?v=sbcCsT9Ab9U)

***

AiBrow is a browser extension that brings AI to your device. It uses small language models on your machine, making it fast and keeping your data private. With AiBrow, you can complete sentences, improve your writing, rephrase text, or sum up complex information using the latest small LLMs such as Llama 3.2, Phi 3.5, Gemma 2 and Qwen 2.5.

The development API follows the current proposal for the browser [Prompt API](https://github.com/explainers-by-googlers/prompt-api?tab=readme-ov-file#stakeholder-feedback) in development within [Chrome](https://developer.chrome.com/docs/ai/built-in). It uses [llama.cpp](https://github.com/ggerganov/llama.cpp) as the inference engine and supports the use of grammar schemas and LoRA Adapters.

The extension works on all Chromium based browsers as well as Firefox.

* [Docs](https://docs.aibrow.ai/)
* [API Reference](https://docs.aibrow.ai/api-reference/aibrow)
* [Playground](https://demo.aibrow.ai/playground/)


## How can I try AiBrow?

The easiest way is to download through the Chrome Web Store or Mozilla add-on store. If you want to try the latest version, you can also install the developer version of the extension.

### Chrome & Chromium based browsers

(Chrome, Chrome Beta, Edge, Vivaldi, Opera, Wavebox, Arc, Chromium)

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/aibrow/bbkbjiehfkggfkbampigbbakecijicdm)
2. Follow the setup wizard after installing the extension
3. [Try out the playground](https://demo.aibrow.ai/playground/)

### Firefox

1. Open the [Releases](https://github.com/axonzeta/aibrow/releases/new) page, download the latest `moz.zip`, then extract it on disk
2. Open `about:debugging#/runtime/this-firefox`
3. Click the `Load temporary Add-on`
4. [Install the native helper](https://aibrow.ai/install.html)
5. [Try out the playground](https://demo.aibrow.ai/playground/)


## How can I use the AiBrow API?

### Website

AiBrow embeds itself into all pages using the `window.aibrow` namespace (also `window.ai` is polyfilled if it's not available natively in the browser). Check out our [developer docs](https://docs.aibrow.ai/) on how to get started!

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
