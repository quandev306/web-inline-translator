# 内联网页翻译器（Inline Web Translator）

这款扩展可以让你在浏览网页时直接翻译选中的文本。高亮需要翻译的内容，按下 `Option + T`（Windows 上为 Alt + T），翻译结果会连同 `[×]` 按钮一起插入到原文之后。默认语言对是英语 → 越南语，但你可以随时切换到任意语言组合。

## 安装步骤（Chrome / Edge）

1. 打开 `chrome://extensions/`（或 `edge://extensions/`）。
2. 在右上角启用 **Developer mode**（开发者模式）。
3. 点击 **Load unpacked**（加载已解压的扩展程序），选择 `web-inline-translator` 文件夹。
4. 访问任意网页，选中英文文本，然后按 `Option + T` 测试效果。

## 工作原理

- 当你按下 `Option + T` 时，内容脚本会指示后台 service worker 调用 `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>` 接口。返回的翻译会以 `[译文][X]` 的形式插入在所选文本之后，同时保留原文的字体、字号以及粗体/斜体等样式。
- 翻译结果显示在一个带 `[×]` 按钮的气泡中，点击即可移除。
- 如果选中的文本超过 500 个字符或 API 请求失败，扩展会在同一位置显示错误提示。

## 自定义翻译后端

- 打开扩展的 **Options** 页面（`chrome://extensions/` → Inline Translator → **Extension options**），即可输入自定义的 API 端点和源语言（`src`）、目标语言（`tgt`）代码。配置会保存到 `chrome.storage.sync` 中，方便你在不同语言对之间切换。
- Options 页面中的下拉列表显示的是易读的语言名称，实际保存的是类似 `eng_Latn`、`vie_Latn` 的语言代码。若需新增或调整选项，请编辑 `data/languages.json`。
- 在 Options 中启用 **Developer mode** 可自由修改端点；关闭后会恢复到默认配置。
- 调试日志由 `data/settings.json` 的 `debug`（或旧版的 `debugMode`）字段控制。设为 `true` 时，Options 页面和内容脚本都会输出带 `[InlineTranslator]` 前缀的日志；设为 `false` 时，即使 Developer mode 开启也不会打印日志。
- 目前 `translate()` 函数通过携带 `q`、`src`、`tgt` 查询参数的 `GET` 请求与 API 通信。如需改用 POST、添加请求头或令牌，可在 `background.js` 中自行调整。

## 快捷键

- macOS：`Option + T`
- Windows/Linux：`Alt + T`

如需修改快捷键，请编辑 `contentScript.js` 中的 `shouldHandleEvent` 函数。

## 注意事项

- 为避免干扰用户输入，扩展不会处理 `input`、`textarea` 或 `contenteditable` 区域中的内容。
