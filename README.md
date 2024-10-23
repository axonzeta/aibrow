AiBrow is a browser extension that brings AI to your device. It uses small language models on your machine, making it fast and keeping your data private. With AiBrow, you can complete sentences, improve your writing, rephrase text, or sum up complex information using the latest small LLMs such as Llama 3.2, Phi 3.5, Gemma 2 and Qwen 2.5.

The development API follows the current proposal for the browser [Prompt API](https://github.com/explainers-by-googlers/prompt-api?tab=readme-ov-file#stakeholder-feedback) in development within [Chrome](https://developer.chrome.com/docs/ai/built-in). It uses [llama.cpp](https://github.com/ggerganov/llama.cpp) as the inference engine and supports the use of grammar schemas and LoRA Adapters.

The extension works on all Chromium based browsers as well as Firefox.


## How can I try AiBrow?

The easiest way is to download through the Chrome Web Store or Mozilla add-on store. If you want to try the latest version, you can also install the developer version of the extension

1. Open the [Releases](https://github.com/axonzeta/aibrow/releases/new) page, download the latest zip of the extension and extract it on disk
2. Open chrome://extensions in a new tab and turn on the developer tools
3. Click the `Load unpacked` button and locate extracted folder
4. Try out our demo

---

## How can I use AiBrow in my site/extension?

AiBrow embeds itself to the page using the `window.ai` namespace. Check out our developer docs on how to get started!

---

## How can I build AiBrow myself?

1. `npm run watch` or `npm start` to build the extension
2. Run `out/native/boot.cjs --install` to install the native manifest hooks
3. Install the extension from `out/extension` into the browser
4. Logs from the native binary are available in `out/native/aibrow.log`


## Examples

1. `cd examples`
1. `npm start`
