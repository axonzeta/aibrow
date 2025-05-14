<h1 align="center">
<sub>
<img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/aibrow-icon.png?raw=true" height="38" width="38">
</sub>
AiBrow
</h1>

Run local AI in your browser with the unified AiBrow JavaScript API. The API allows you to make the best use of the devices hardware to run local AI in the browser in the most performant way possible. It's based around the [Chrome built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis), but adds support for new features such as custom/HuggingFace models, grammar schemas, JSON output, LoRa Adapters, embeddings, and a fallback to a self-hosted or public server for lower powered devices.

| Engine             | Targets                               | Custom models | HuggingFace models | Runs on-device | Grammar output | LoRA Adapters | Embeddings | GPU Required | Performance |
| ------------------ | ------------------------------------- | ------------- | ------------------ | -------------- | -------------- | ------------- | ---------- | ------------ | ----------- |
| Chrome AI          | Chrome Desktop                        | ❌            | ❌                 | ✅              | ❌             | ❌            | ❌          | ✅           | ⭐️⭐️         |
| llama.cpp          | Desktop Browsers                      | ✅            | ✅                 | ✅              | ✅             | ✅            | ✅          | ❌           | ⭐️⭐️⭐️       |
| WebGPU             | Desktop & Android Browsers            | ✅            | ✅                 | ✅              | ✅             | ❌            | ✅          | ❌           | ⭐️          |
| Self-hosted Server | Any browser                           | ✅            | ✅                 | ❌              | ✅             | ✅            | ✅          | ❌           | ⭐️⭐️⭐️       |
| Public Server      | Any browser                           | ✅            | ✅                 | ❌              | ✅             | ✅            | ✅          | ❌           | ⭐️⭐️         |

When using AiBrow through the llama.cpp extension or WebGPU, it runs small language models completely on your machine, making it fast and keeping your data private. You can complete sentences, improve your writing, rephrase text, or sum up complex information using the latest small LLMs such as Llama 3.2, Phi 3.5, Gemma 2 and Qwen 2.5.

The AiBrow API follows the current proposal for the browser [Prompt API](https://github.com/explainers-by-googlers/prompt-api) in development in [Google Chrome](https://developer.chrome.com/docs/ai/built-in).

* [Docs](https://docs.aibrow.ai/)
* [API Reference](https://docs.aibrow.ai/api-reference/aibrow)
* [Playground](https://demo.aibrow.ai/playground/)

## Quick Start

Install the dependencies:

```js
npm install @aibrow/web
```

You can use the languageModel API to have a conversation with the AI, using whichever backend you choose.

```js
import AI from '@aibrow/web'

// WebGPU
const webGpu = await AI.AIBrowWeb.LanguageModel.create()
console.log(await webGpu.prompt('Write a short poem about the weather'))

// Llama.cpp
const ext = await AI.AIBrow.LanguageModel.create()
console.log(await ext.prompt('Write a short poem about the weather'))

// Chrome AI
const browser = await AI.Browser.LanguageModel.create()
console.log(await browser.prompt('Write a short poem about the weather'))

// Server
const server = await AI.Server.LanguageModel.create()
console.log(await server.prompt('Write a short poem about the weather'))

```

## AiBrow extension using llama.cpp natively

<p>
<a href="https://chromewebstore.google.com/detail/aibrow/bbkbjiehfkggfkbampigbbakecijicdm"><img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/chrome_webstore_icon.png?raw=true" width="228" height="64" alt="Get AiBrow for Chrome" /></a>
<a href="#firefox"><img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/firefox-addon.png?raw=true" width="183" height="64"alt="Get AiBrow for Firefox"></a>
</p>

<p>
<a href="https://www.youtube.com/watch?v=ATybwD79jUI"><img src="https://github.com/axonzeta/aibrow/blob/main/.github/assets/install_preview.png?raw=true" width="480" height="270" alt="Step by step install" /></a>
</p>

Using the AiBrow extension gives the best on-device performance with the broadest feature-set. It's a browser extension that leverages the powerful [llama.cpp](https://github.com/ggerganov/llama.cpp) and can give great performance on all kinds of desktop computers either leveraging the GPU or CPU. Downloaded models are stored in a common repository meaning models only need to be downloaded once. You can use models provided by AiBrow, or any GGUF model hosted on [HuggingFace](https://huggingface.co/).

##### Getting started

```js
import AI from '@aibrow/web'

if (AI.AIBrow) {
  const { ready } = await AI.AIBrow.capabilities()
  if (ready) {
    const session = await AI.AIBrow.LanguageModel.create()
    console.log(await session.prompt('Write a short poem about the weather'))
  } else {
    // Here are some tips to help users install the AiBrow extension & helper https://docs.aibrow.ai/guides/helping-users-install-aibrow
    console.log(`Install the extension from https://aibrow.ai/install?redirect_to=${window.location.href}`)
  }
} else {
  // Here are some tips to help users install the AiBrow extension & helper https://docs.aibrow.ai/guides/helping-users-install-aibrow
  console.log(`Install the extension from https://aibrow.ai/install?redirect_to=${window.location.href}`)
}
```

<details>
<summary>Additional info</summary>
When the extension is installed, it's directly usable on any page via `window.aibrow` or if installed on a browser other than Google Chrome it automatically polyfills `window.ai`.
</details>

<details>
<summary>Typescript types</summary>

Types for `window.aibrow` can be added to your project by using the `npm install --save-dev @aibrow/dom-types` package. Then to expose them, place the following either in your `global.d.ts` or the entry point to your code

```ts
import type AI from "@aibrow/dom-types"

declare global {
  interface Window {
    readonly aibrow: typeof AI;
  }
}
```
</details>

<details>
<summary>Other extensions</summary>

Other extensions can make use of the AiBrow extension by using the extension library library using `npm install @aibrow/extension`

```js
import aibrow from '@aibrow/extension'

const { ready } = await aibrow.capabilities()
if (ready) {
  const session = await aibrow.LanguageModel.create()
  const stream = await sess.promptStreaming('Write a poem about AI in the browser')
  for await (const chunk of stream) {
    console.log(chunk)
  }
} else {
  console.log(`Install the extension from https://aibrow.ai/install?redirect_to=${window.location.href}`)
}
```
</details>

## AiBrow on WebGPU

WebGPU provides a good middle-ground for performance and feature set, but it comes with some memory usage restrictions and performance overheads. If you only need to use small models or want to provide a fallback for when the extension isn't installed this can provide a great solution. Under the hood it uses [transformers.js](https://github.com/huggingface/transformers.js) from HuggingFace. Models are downloaded through an AiBrow frame which means models only need to be downloaded once. You can use models provided by AiBrow, or any ONNX model hosted on [HuggingFace](https://huggingface.co/).

##### Getting started

```js
import AI from '@aibrow/web'

const session = await AI.AIBrowWeb.LanguageModel.create()
console.log(await session.prompt('Write a short poem about the weather'))
```

## Chrome built-in AI

The Chrome built-in AI is a great option for simple tasks such as summarization, writing etc. It has a smaller feature-set compared to the AiBrow extension and WebGPU and has reasonable on-device performance.

##### Getting started

```js
import AI from '@aibrow/web'

if (AI.AIBrow) {
  const session = await AI.AIBrow.LanguageModel.create()
  console.log(await session.prompt('Write a short poem about the weather'))
} else {
  console.log(`Your browser doesn't support browser window.ai`)
}
```

## How can I build AiBrow myself?

1. `npm run watch` or `npm start` to build the extension
2. Run `out/native/boot.cjs --install` to install the native manifest hooks
3. Install the extension from `out/extension` into the browser
4. Logs from the native binary are available in `out/native/aibrow.log`


## Examples

1. [AiBrow Playground](https://github.com/axonzeta/aibrow-playground)
2. [AiBrow demo extension](https://github.com/axonzeta/aibrow-demo-extension)
