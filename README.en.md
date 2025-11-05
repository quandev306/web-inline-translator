# Inline Web Translator

Inline Web Translator lets you translate any piece of text directly on the page you are browsing. Highlight the content you want to translate, press `Option + T` (Alt + T on Windows), and the extension will insert the translated text with a handy `[×]` button to remove it. The default language pair is English → Vietnamese, but you can choose any source and target language combination you need.

## Installation (Chrome / Edge)

1. Open `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and point to the `web-inline-translator` folder.
4. Visit any webpage, highlight English text, then press `Option + T`.

## How It Works

- Pressing `Option + T` instructs the content script to ask the background service worker to call the API at `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>`. The response is inserted right after the selected text as `[Translation][X]`, preserving the original font, size, and emphasis (bold/italic).
- The translation appears inside a floating “bubble” with an `[×]` button that removes it.
- If the selected text exceeds 500 characters or the API fails, the extension displays an inline error instead.

## Customizing the Translation Backend

- Open the extension **Options** page (Chrome: `chrome://extensions/` → Inline Translator → **Extension options**). You can enter a custom API endpoint together with source (`src`) and target (`tgt`) language codes. The values are stored in `chrome.storage.sync`, so you can switch between multiple language pairs easily.
- The dropdown lists in Options show friendly language names, while the saved values are the full codes (e.g., `eng_Latn`, `vie_Latn`). To add or tweak entries, edit `data/languages.json`.
- Enable **Developer mode** within Options to allow editing the endpoint; when disabled, the extension falls back to the bundled default.
- Debug logging is controlled by the `debug` flag in `data/settings.json` (or `debugMode` for older configs). Set it to `true` to see logs from both the Options page and the content script (prefixed with `[InlineTranslator]`), or `false` to silence them even if Developer mode is on.
- The `translate()` helper currently sends a `GET` request with `q`, `src`, and `tgt` in the query string. If your API requires a different method (POST, headers, tokens, etc.), adjust the logic in `background.js`.

## Keyboard Shortcut

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

You can customize the shortcut by updating the `shouldHandleEvent` logic in `contentScript.js`.

## Notes

- The extension ignores editable fields (`input`, `textarea`, and `contenteditable` regions) to avoid interfering with user input.
