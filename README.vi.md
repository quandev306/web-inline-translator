# Trình Dịch Inline Trên Web

Tiện ích mở rộng Inline Web Translator giúp bạn dịch nhanh bất kỳ đoạn văn bản ngay trên trang đang xem. Chỉ cần bôi đen nội dung, nhấn `Option + T` (hoặc `Alt + T` trên Windows) và bản dịch sẽ xuất hiện ngay dưới đoạn chữ gốc kèm nút `[×]` để xóa. Mặc định, tiện ích dịch từ tiếng Anh sang tiếng Việt, nhưng bạn có thể chọn bất kỳ cặp ngôn ngữ nào phù hợp.

## Ngôn Ngữ Khác

- [English](README.en.md)
- [한국어](README.ko.md)
- [日本語](README.ja.md)
- [简体中文](README.zh.md)
- [Deutsch](README.de.md)

## Cài Đặt (Chrome / Edge)

1. Mở `chrome://extensions/` (hoặc `edge://extensions/`).
2. Bật **Developer mode** ở góc trên bên phải.
3. Chọn **Load unpacked** và trỏ đến thư mục `web-inline-translator`.
4. Truy cập một trang bất kỳ, bôi đen văn bản tiếng Anh rồi nhấn `Option + T`.

## Cách Hoạt Động

- Content script nhận phím tắt `Option + T`, sau đó yêu cầu service worker nền gọi API tại `{{YOUR_ENDPOINT}}?q=<text>&src=<sourceLang>&tgt=<targetLang>`. Phản hồi được chèn ngay sau đoạn văn bản đã chọn dưới dạng `[Bản dịch][X]`, giữ nguyên font, cỡ chữ và định dạng (đậm/ nghiêng).
- Kết quả xuất hiện trong một “bong bóng” nổi có nút `[×]` để loại bỏ khi không cần nữa.
- Nếu đoạn văn bản dài hơn 500 ký tự hoặc API gặp lỗi, tiện ích sẽ hiển thị thông báo lỗi ngay tại chỗ.

## Tùy Chỉnh Máy Chủ Dịch

- Mở trang **Tùy chọn** của tiện ích (Chrome: `chrome://extensions/` → Inline Translator → **Extension options**). Tại đây bạn có thể nhập endpoint API tùy chỉnh cùng mã ngôn ngữ nguồn (`src`) và đích (`tgt`). Các giá trị được lưu trong `chrome.storage.sync`, giúp bạn chuyển đổi nhanh giữa nhiều cặp ngôn ngữ.
- Danh sách ngôn ngữ trên trang Tùy chọn hiển thị tên dễ hiểu, nhưng khi lưu sẽ dùng mã đầy đủ (ví dụ: `eng_Latn`, `vie_Latn`). Muốn bổ sung hay chỉnh sửa, hãy cập nhật `data/languages.json`.
- Bật **Developer mode** trong trang Tùy chọn để chỉnh sửa endpoint; khi tắt, tiện ích sẽ dùng endpoint mặc định đi kèm.
- Ghi log debug được điều khiển qua cờ `debug` trong `data/settings.json` (hoặc `debugMode` với cấu hình cũ). Đặt `true` để xem log từ trang Tùy chọn và content script (tiền tố `[InlineTranslator]`), hoặc `false` để ẩn log ngay cả khi bật Developer mode.
- Hàm `translate()` hiện gửi yêu cầu `GET` với tham số `q`, `src`, `tgt` trong query string. Nếu API của bạn cần phương thức khác (POST, headers, token, …), hãy chỉnh sửa logic trong `background.js`.

## Phím Tắt

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

Bạn có thể thay đổi phím tắt bằng cách cập nhật hàm `shouldHandleEvent` trong `contentScript.js`.

## Ghi Chú

- Tiện ích bỏ qua các trường có thể chỉnh sửa (`input`, `textarea`, `contenteditable`) để không ảnh hưởng tới nội dung bạn đang gõ.
