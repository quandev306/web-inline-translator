# Inline English → Vietnamese Translator

Tiện ích mở rộng cho phép bạn dịch nhanh các đoạn văn bản tiếng Anh ngay trên trang web. Chỉ cần bôi đen đoạn nội dung muốn dịch rồi nhấn `Option + T` (Alt + T trên Windows) để chèn bản dịch tiếng Việt kèm nút `[×]` để xóa.

## Cách cài đặt (Chrome / Edge)

1. Mở `chrome://extensions/` (hoặc `edge://extensions/`).
2. Bật **Developer mode** (Chế độ nhà phát triển) ở góc phải.
3. Chọn **Load unpacked** (Tải tiện ích đã giải nén) và trỏ tới thư mục `web-inline-translator`.
4. Mở bất kỳ trang web nào, bôi đen đoạn văn bản tiếng Anh, sau đó nhấn `Option + T`.

## Hoạt động

- Khi nhấn `Option + T`, script sẽ yêu cầu background service worker gửi API tới `https://translate.seniordev.uk/translate?q=<text>` rồi chèn bản dịch tiếng Việt ngay sau đoạn văn bản đã chọn dưới dạng `[Bản dịch][X]`, giữ nguyên kiểu chữ (font, cỡ, in đậm/nghiêng) của đoạn gốc.
- Bản dịch hiển thị trong một “bong bóng” kèm nút `[×]` để xóa.
- Nếu đoạn văn bản dài hơn 500 ký tự hoặc API gặp lỗi, tiện ích sẽ thông báo tại chỗ.

## Tùy chỉnh nguồn dịch

- Mở trang **Options** của tiện ích (Chrome: `chrome://extensions/` → Inline Translator → **Extension options**). Tại đây bạn có thể nhập endpoint API, mã ngôn ngữ nguồn (`source`) và ngôn ngữ đích (`target`). Tiện ích sẽ lưu giá trị vào `chrome.storage.sync` và áp dụng ngay.
- Danh sách ngôn ngữ trong Options hiển thị tên đầy đủ, giá trị thực tế lưu về là mã chi tiết (ví dụ `eng_Latn`, `vie_Latn`). Nếu muốn bổ sung hoặc chỉnh sửa, hãy cập nhật file `data/languages.json`.
- Bật **Developer mode** trong Options để cho phép chỉnh sửa endpoint tuỳ ý; khi tắt, tiện ích sẽ quay về endpoint mặc định.
- Hàm `translate()` hiện thực hiện request `GET` với query string gồm `q`, kèm `source`/`target` nếu bạn đã cấu hình. Nếu API yêu cầu phương thức khác (POST, header, token…), hãy điều chỉnh thêm trong `background.js`.

## Phím tắt

- macOS: `Option + T`
- Windows/Linux: `Alt + T`

Bạn có thể thay đổi phím tắt bằng cách chỉnh sửa logic trong `contentScript.js`, hàm `shouldHandleEvent`.

## Lưu ý

- Tiện ích không can thiệp vào các trường nhập liệu (`input`, `textarea`, hoặc vùng `contenteditable`).