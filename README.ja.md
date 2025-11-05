# インライン Web 翻訳 (Inline Web Translator)

この拡張機能を使うと、閲覧中のページで選択したテキストをその場で別の言語に翻訳できます。翻訳したい部分を選択して `Option + T`（Windows では Alt + T）を押すだけで、翻訳結果が `[×]` ボタン付きで挿入されます。初期設定は英語 → ベトナム語ですが、任意の言語ペアに変更できます。

## インストール方法（Chrome / Edge）

1. `chrome://extensions/`（または `edge://extensions/`）を開きます。
2. 右上の **Developer mode**（デベロッパーモード）をオンにします。
3. **Load unpacked**（パッケージ化されていない拡張機能を読み込む）をクリックし、`web-inline-translator` フォルダーを選択します。
4. 任意のページで英語のテキストを選択し、`Option + T` を押して動作を確認します。

## 動作概要

- `Option + T` を押すと、コンテンツスクリプトがバックグラウンドのサービスワーカーに `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>` への API リクエストを送るよう指示します。返ってきた翻訳は選択したテキスト直後に `[翻訳][X]` 形式で挿入され、元のフォント・サイズ・太字／斜体などのスタイルが維持されます。
- 翻訳は `[×]` ボタン付きのバブルとして表示され、ボタンを押すと翻訳が削除されます。
- 選択した文字数が 500 を超える、もしくは API リクエストが失敗した場合は、その場でエラーメッセージを表示します。

## 翻訳バックエンドのカスタマイズ

- 拡張機能の **Options** ページ（`chrome://extensions/` → Inline Translator → **Extension options**）で、任意の API エンドポイントとソース（`src`）、ターゲット（`tgt`）言語コードを設定できます。値は `chrome.storage.sync` に保存されるため、複数の言語ペアを簡単に切り替えられます。
- Options のドロップダウンでは言語名が表示されますが、保存される値は `eng_Latn` や `vie_Latn` のようなコードです。項目を追加・変更したい場合は `data/languages.json` を編集してください。
- Options 内の **Developer mode** をオンにするとエンドポイントを自由に編集でき、オフにすると同梱のデフォルト設定に戻ります。
- デバッグログの出力は `data/settings.json` の `debug`（または旧設定の `debugMode`）フラグで制御します。`true` にすると Options ページとコンテンツスクリプトの両方で `[InlineTranslator]` プレフィックスのログが表示され、`false` にすると Developer mode がオンでもログは出力されません。
- 現在 `translate()` 関数は `q`、`src`、`tgt` をクエリパラメーターに含む `GET` リクエストを送信します。POST や追加ヘッダー、トークンなどが必要な場合は `background.js` を調整してください。

## ショートカットキー

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

ショートカットを変更したい場合は、`contentScript.js` の `shouldHandleEvent` 関数を編集してください。

## 注意事項

- ユーザー入力を妨げないよう、`input`、`textarea`、`contenteditable` 領域では動作しません。
