# Luki Party Games

Luki là nền tảng minigame nhóm song ngữ Việt–Anh, có giao diện bàn chơi chung, thẻ đáp án úp/lật, tài khoản người chơi tùy chọn và một backend local dành cho admin + AI.

Website: <https://hoangkim0312.github.io/Luki-Minigame/>

## Có gì trong MVP

- 4 game có thể tạo phòng: **Chung Tần Số**, **Ai Đã Nói?**, **Nghĩ Quanh Con Số** và **Ý Kiến Nóng**.
- Người chơi ngồi quanh cùng một board; trạng thái đã trả lời được hiển thị nhưng đáp án vẫn úp cho tới lúc host lật bài.
- Khách vào phòng bằng tên + mã, không cần tài khoản.
- Người chơi có thể đăng ký để lưu danh tính; admin đăng nhập bằng tài khoản do backend tạo.
- Admin thêm/chỉnh game, bật/tắt xuất bản, sửa bộ câu hỏi VI/EN và tạo câu hỏi AI theo chủ đề.
- Khi chưa có OpenAI API key, backend dùng bộ câu hỏi dự phòng để luồng quản trị vẫn hoạt động.

## Chạy frontend

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Frontend mặc định ở `http://localhost:3000`.

## Chạy backend local

Sao chép `.env.example` thành `.env.local`, sau đó thay ít nhất:

```dotenv
SESSION_SECRET=mot-chuoi-ngau-nhien-dai
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mat-khau-manh
OPENAI_API_KEY=
```

Không commit `.env.local` và không đưa API key vào biến `NEXT_PUBLIC_*`.

```bash
npm run dev:server
```

Backend chạy ở `http://localhost:8787`. Lần chạy đầu sẽ tạo tài khoản admin và dữ liệu trong `.local-data/` (đã được gitignore). Model có thể đổi qua `OPENAI_MODEL`; mặc định là `gpt-5.6-sol`.

## Dùng backend local với GitHub Pages

Trang GitHub Pages chạy HTTPS nên trình duyệt không thể gọi thẳng backend HTTP ở máy bạn. Cần:

1. Mở một HTTPS tunnel trỏ tới `http://localhost:8787` (Cloudflare Tunnel, ngrok hoặc dịch vụ tương đương).
2. Đặt `ALLOWED_ORIGINS=https://hoangkim0312.github.io` trong `.env.local`.
3. Trong GitHub repo, vào **Settings → Secrets and variables → Actions → Variables**, tạo `NEXT_PUBLIC_API_URL` với URL HTTPS của tunnel.
4. Chạy lại workflow **Deploy GitHub Pages**.

Nếu backend/tunnel tắt, website công khai vẫn tải và khách vẫn chơi bản local demo; đăng nhập, quản trị và AI sẽ tạm không dùng được.

## Kiểm tra và deploy

```bash
npm run lint
npm test
```

Mỗi push lên `main` sẽ chạy `.github/workflows/deploy-pages.yml` và deploy thư mục static export. Vercel cũng có thể import trực tiếp repository; hãy đặt `NEXT_PUBLIC_API_URL` trong Project Environment Variables nếu dùng Vercel.

## Lưu ý kiến trúc

Phòng hiện đồng bộ giữa các tab cùng trình duyệt bằng `localStorage`, phù hợp để demo UI/luật chơi. Để nhiều thiết bị chơi qua Internet thật sự, bước tiếp theo là chuyển room state, WebSocket và tính điểm sang backend server-authoritative. Backend auth hiện dùng token HMAC, mật khẩu băm bằng `scrypt`, và chỉ endpoint admin mới được phép thay đổi game/tạo câu hỏi AI.
