# Inline Web Translator

Mit dieser Erweiterung kannst du markierten Text direkt auf einer Webseite in eine andere Sprache übersetzen. Markiere den gewünschten Abschnitt und drücke `Option + T` (unter Windows `Alt + T`), dann erscheint die Übersetzung mit einer `[×]`-Schaltfläche zum Entfernen. Standardmäßig wird von Englisch nach Vietnamesisch übersetzt, aber du kannst jedes beliebige Sprachpaar konfigurieren.

## Installation (Chrome / Edge)

1. Öffne `chrome://extensions/` (bzw. `edge://extensions/`).
2. Aktiviere oben rechts den **Developer mode**.
3. Klicke auf **Load unpacked** und wähle den Ordner `web-inline-translator` aus.
4. Besuche eine beliebige Webseite, markiere englischen Text und drücke `Option + T`.

## Funktionsweise

- Wenn du `Option + T` drückst, weist das Content Script den Background-Service-Worker an, die API `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>` aufzurufen. Die Antwort wird direkt hinter dem markierten Text als `[Übersetzung][X]` eingefügt, wobei Schriftart, Größe sowie Fett-/Kursivformatierung erhalten bleiben.
- Die Übersetzung erscheint in einer kleinen „Bubble“ mit einer `[×]`-Schaltfläche, über die sie wieder entfernt werden kann.
- Überschreitet der markierte Text 500 Zeichen oder schlägt der API-Aufruf fehl, zeigt die Erweiterung eine Fehlermeldung an derselben Stelle an.

## Anpassung des Übersetzungs-Backends

- Öffne die **Options**-Seite der Erweiterung (`chrome://extensions/` → Inline Translator → **Extension options**). Dort kannst du einen eigenen API-Endpunkt sowie Quell- (`src`) und Zielsprach-Codes (`tgt`) eintragen. Die Werte werden in `chrome.storage.sync` gespeichert, sodass du bequem zwischen mehreren Sprachpaaren wechseln kannst.
- Die Dropdowns im Options-Dialog zeigen lesbare Sprachennamen an; gespeichert werden jedoch vollständige Codes wie `eng_Latn` oder `vie_Latn`. Möchtest du Einträge hinzufügen oder ändern, bearbeite die Datei `data/languages.json`.
- Aktiviere **Developer mode** innerhalb der Options, um den Endpunkt beliebig anzupassen. Deaktivierst du ihn, verwendet die Erweiterung wieder den mitgelieferten Standard.
- Das Debug-Logging lässt sich über das Feld `debug` (bzw. `debugMode` in älteren Konfigurationen) in `data/settings.json` steuern. Bei `true` geben sowohl Options-Seite als auch Content Script protokollierte Meldungen mit dem Präfix `[InlineTranslator]` aus; bei `false` bleiben alle Logs stumm, selbst wenn Developer mode aktiviert ist.
- Die Funktion `translate()` sendet derzeit eine `GET`-Anfrage mit den Parametern `q`, `src` und `tgt`. Wenn dein Backend andere Anforderungen hat (z. B. POST, zusätzliche Header oder Tokens), passe die Logik in `background.js` entsprechend an.

## Tastenkürzel

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

Um das Kürzel zu ändern, bearbeite die Funktion `shouldHandleEvent` in `contentScript.js`.

## Hinweise

- Um Benutzereingaben nicht zu stören, reagiert die Erweiterung nicht in `input`-, `textarea`- oder `contenteditable`-Elementen.
