# Luki Party Games

Luki là nền tảng minigame nhóm song ngữ Việt–Anh, có giao diện bàn chơi chung, thẻ đáp án úp/lật, tài khoản người chơi tùy chọn và một backend local dành cho admin + AI.

Website: <https://hoangkim0312.github.io/Luki-Minigame/>

## Có gì trong MVP

- 4 game có thể tạo phòng: **Chung Tần Số**, **Ai Đã Nói?**, **Nghĩ Quanh Con Số** và **Ý Kiến Nóng**.
- Người chơi ngồi quanh cùng một board; trạng thái đã trả lời được hiển thị nhưng đáp án vẫn úp cho tới lúc host lật bài.
- Khách vào phòng bằng tên + mã, không cần tài khoản.
- Người chơi có thể đăng ký để lưu danh tính; admin đăng nhập bằng tài khoản do backend tạo.
- Admin thêm/chỉnh game, bật/tắt xuất bản, sửa bộ câu hỏi VI/EN và tạo câu hỏi AI theo chủ đề.
- Phòng được đồng bộ giữa nhiều thiết bị bằng Socket.IO; server quyết định room state, điểm số và thời điểm reveal.
- Resume token cho phép refresh/rejoin; người mất kết nối có 30 giây trước khi bị rời lobby hoặc chuyển host.
- Groq tạo câu hỏi dạng JSON có kiểm tra schema; khi Groq lỗi backend dùng bộ câu hỏi dự phòng.

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
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

Không commit `.env.local` và không đưa API key vào biến `NEXT_PUBLIC_*`.

```bash
npm run dev:server
```

Backend REST + Socket.IO chạy ở `http://localhost:8787`. Lần chạy đầu sẽ tạo tài khoản admin và dữ liệu trong `.local-data/` (đã được gitignore).

## Dùng backend local với GitHub Pages

Cách nhanh nhất — chạy một lệnh:

```bash
npm run dev:online
```

Lệnh này tự khởi động backend, tạo Cloudflare Quick Tunnel hỗ trợ HTTPS/WSS, kiểm tra kết nối và in ra một **Share this link**. Gửi nguyên link đó cho người chơi. Tham số `?server=...` được frontend lưu trên thiết bị, vì vậy không cần sửa GitHub variable hoặc deploy lại mỗi lần tunnel đổi URL. Giữ terminal mở trong lúc chơi; nhấn `Ctrl+C` để tắt backend và tunnel.

Máy cần có `cloudflared` trong `PATH`. Có thể chỉ định đường dẫn riêng qua biến `CLOUDFLARED_PATH`.

### Tunnel cố định

Trang GitHub Pages chạy HTTPS nên trình duyệt không thể gọi thẳng backend HTTP ở máy bạn. Cần:

1. Mở một HTTPS tunnel trỏ tới `http://localhost:8787` (Cloudflare Tunnel, ngrok hoặc dịch vụ tương đương).
2. Đặt `ALLOWED_ORIGINS=https://hoangkim0312.github.io` trong `.env.local`.
3. Trong GitHub repo, vào **Settings → Secrets and variables → Actions → Variables**, tạo `NEXT_PUBLIC_API_URL` với URL HTTPS của tunnel.
4. Chạy lại workflow **Deploy GitHub Pages**.

Tunnel phải hỗ trợ WebSocket (`wss://`). Nếu backend/tunnel tắt, website vẫn tải nhưng tạo phòng, vào phòng, đăng nhập, quản trị và AI sẽ tạm không dùng được.

## Kiểm tra và deploy

```bash
npm run lint
npm test
```

Mỗi push lên `main` sẽ chạy `.github/workflows/deploy-pages.yml` và deploy thư mục static export. Vercel cũng có thể import trực tiếp repository; hãy đặt `NEXT_PUBLIC_API_URL` trong Project Environment Variables nếu dùng Vercel.

## Trạng thái roadmap

Project đang ở **Phase 1 (gần hoàn tất)**: guest session, room, lobby, Socket.IO, ready/start và reconnect cơ bản đã hoạt động. PostgreSQL và Redis chưa được thêm nên room vẫn nằm trong RAM và mất khi backend restart.

Một phần Phase 2 và Phase 4 đã có sớm: tách public/private payload, server-authoritative reveal/score, AI provider Groq, schema validation và fallback. Timer engine, game-module interface hoàn chỉnh và ba bộ luật game riêng vẫn chưa hoàn tất.

Xem [trạng thái phase](docs/PHASE_STATUS.md) và [tài liệu Socket.IO](docs/SOCKET_EVENTS.md).
