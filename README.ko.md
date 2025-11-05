# 인라인 웹 번역기 (Inline Web Translator)

이 확장 프로그램은 웹 페이지에서 선택한 텍스트를 바로 다른 언어로 번역해 보여 줍니다. 번역하고 싶은 내용을 드래그해서 선택하고 `Option + T`(Windows에서는 Alt + T)를 누르면 번역문이 `[×]` 버튼과 함께 삽입됩니다. 기본 설정은 영어 → 베트남어이지만, 원하는 어떠한 언어 조합이든 자유롭게 변경할 수 있습니다.

## 설치 방법 (Chrome / Edge)

1. `chrome://extensions/`(또는 `edge://extensions/`)을 엽니다.
2. 오른쪽 상단에서 **개발자 모드**를 활성화합니다.
3. **Load unpacked**(압축 해제된 확장 프로그램 로드)를 클릭한 뒤 `web-inline-translator` 폴더를 선택합니다.
4. 아무 웹 페이지나 열고 영어 텍스트를 선택한 후 `Option + T`를 눌러 번역을 확인합니다.

## 동작 방식

- `Option + T`를 누르면 콘텐츠 스크립트가 백그라운드 서비스 워커에 `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>` API 요청을 보내도록 지시합니다. 응답으로 받은 번역은 선택한 텍스트 바로 뒤에 `[번역][X]` 형식으로 삽입되며, 원문의 글꼴·크기·굵게/기울임 속성이 그대로 유지됩니다.
- 번역 결과는 `[×]` 버튼이 포함된 말풍선 형태로 표시됩니다. 버튼을 누르면 번역이 즉시 제거됩니다.
- 선택한 텍스트가 500자 이상이거나 API 호출에 실패하면 확장 프로그램이 같은 위치에 오류 메시지를 표시합니다.

## 번역 백엔드 커스터마이징

- 확장 프로그램의 **Options** 페이지를 열어(`chrome://extensions/` → Inline Translator → **Extension options**) 사용자 지정 API 엔드포인트와 소스(`src`), 타깃(`tgt`) 언어 코드를 입력할 수 있습니다. 설정은 `chrome.storage.sync`에 저장되어 여러 언어 조합을 손쉽게 오갈 수 있습니다.
- Options 페이지의 드롭다운은 친숙한 언어 이름을 보여 주지만 실제로 저장되는 값은 `eng_Latn`, `vie_Latn` 같은 전체 코드입니다. 항목을 추가하거나 수정하려면 `data/languages.json`을 편집하세요.
- Options에서 **Developer mode**를 켜면 엔드포인트를 자유롭게 수정할 수 있으며, 끄면 다시 기본값으로 돌아갑니다.
- 디버그 로그 출력은 `data/settings.json`의 `debug`(또는 구형 설정에서 `debugMode`) 플래그로 제어합니다. `true`로 설정하면 Options 페이지와 콘텐츠 스크립트 양쪽에서 `[InlineTranslator]` 접두사의 로그가 출력되고, `false`로 두면 Developer mode가 켜져 있어도 로그가 표시되지 않습니다.
- 현재 `translate()` 함수는 `q`, `src`, `tgt`를 쿼리 파라미터로 포함한 `GET` 요청을 사용합니다. 필요하다면 `background.js`에서 POST 방식이나 헤더, 토큰 등을 추가로 구현하세요.

## 단축키

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

단축키를 바꾸고 싶다면 `contentScript.js`의 `shouldHandleEvent` 함수를 수정하면 됩니다.

## 참고 사항

- 사용자 입력을 방해하지 않도록 `input`, `textarea`, `contenteditable` 영역에서는 동작하지 않습니다.
