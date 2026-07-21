# Luki Party Games

Luki là nền tảng minigame nhóm với giao diện song ngữ Việt–Anh. Bản MVP hiện tại tập trung vào luồng tạo phòng, tham gia bằng mã và game **Chung Tần Số** có thể chơi hoàn chỉnh trong chế độ phòng cục bộ.

## Chạy tại máy

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Mở địa chỉ được in trong terminal (mặc định `http://localhost:3000`).

## Kiểm tra

```bash
npm run build
npm run lint
npm test
```

## Tính năng đang hoạt động

- Trang chủ, kho game, tạo phòng, tham gia phòng và sảnh chờ responsive.
- Tiếng Việt là ngôn ngữ mặc định; có nút đổi VI/EN toàn cục và lưu lựa chọn trên thiết bị.
- Tách riêng ngôn ngữ giao diện và ngôn ngữ câu hỏi khi tạo phòng.
- Bộ câu hỏi mẫu bằng Tiếng Việt và English.
- Đồng bộ phòng giữa nhiều tab cùng trình duyệt bằng `localStorage` và `storage` events.
- Mã mời, trạng thái sẵn sàng, vai trò chủ phòng và người chơi thử cục bộ.
- Một vòng chơi Chung Tần Số: gửi đáp án riêng, chuẩn hoá đáp án, ghép câu trả lời trùng, tính điểm, chuyển vòng và kết quả.
- Social card riêng tại `public/og.png` với metadata Open Graph/X theo host hiện tại.

## Cấu trúc chính

```text
app/
  i18n-provider.tsx   Bộ từ điển VI/EN và locale context
  party-app.tsx       Luồng giao diện, phòng cục bộ và game mẫu
  page.tsx            Trang chủ
  create/             Tạo phòng
  play/               Tham gia bằng mã
  games/              Kho trò chơi
  room/[code]/        Sảnh và game đang chơi
tests/
  rendered-html.test.mjs
```

## Thêm bản dịch

1. Thêm cùng một key vào cả `messages.vi` và `messages.en` trong `app/i18n-provider.tsx`.
2. Dùng `t("key")` trong component thay vì viết chuỗi trực tiếp.
3. Với chuỗi động, dùng biến dạng `t("roundOf", { round, total })`.
4. Thêm câu hỏi game vào `questions.vi` và `questions.en` trong `app/party-app.tsx`.

TypeScript bắt buộc mọi key của `t()` phải tồn tại trong từ điển Tiếng Việt. Build và test render sẽ kiểm tra trang vẫn dùng `lang="vi"` và không còn nội dung starter.

## Giới hạn hiện tại

Phòng hiện chỉ là bản chơi cục bộ để xác nhận UX và i18n; chưa có Socket.IO, PostgreSQL/Redis, WebRTC hay bảo mật server-authoritative. Không dùng kiến trúc hiện tại để vận hành phòng công khai trên Internet. Bước production tiếp theo là chuyển `RoomRecord` và toàn bộ action/tính điểm sang server thời gian thực, sau đó giữ nguyên lớp i18n phía client.
