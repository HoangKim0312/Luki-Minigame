# Trạng thái triển khai

## Kiến trúc hiện tại

```text
GitHub Pages / Vercel static frontend
        │ HTTPS + WSS
        ▼
Node.js local backend
  ├─ REST: auth, admin, game config, Groq
  ├─ Socket.IO: room và game state
  ├─ in-memory active rooms
  └─ JSON local: users và game definitions
```

## Phase 1 — gần hoàn tất

- [x] Guest display name và resume token.
- [x] Tạo/vào phòng bằng mã 6 ký tự.
- [x] Lobby nhiều thiết bị qua Socket.IO.
- [x] Ready/unready và host start.
- [x] Server-authoritative room state.
- [x] Reconnect và grace period 30 giây.
- [x] Chuyển host khi host offline quá grace period.
- [ ] PostgreSQL và migration.
- [ ] Redis cho active room/reconnect qua server restart.
- [ ] Docker Compose.

Kết luận: project vẫn thuộc **Phase 1**, chưa nên đánh dấu Phase 1 hoàn tất cho tới khi có PostgreSQL + Redis theo yêu cầu gốc.

## Phần đã làm trước roadmap

- Phase 2 một phần: public/private payload, duplicate-answer protection, server-side score và reveal.
- Phase 4 một phần: AI provider Groq, structured JSON, Zod validation và fallback questions.
- UI/admin: login tùy chọn, game workshop, board và thẻ úp/lật.
- Game realtime riêng: **Nghĩ Quanh Con Số** và **Điểm Giao Nhau** (chuỗi liên tưởng 2 người cho tới khi trùng đáp án).

## Bước kế tiếp

1. Thêm PostgreSQL, Prisma schema/migrations và Redis.
2. Tách state machine/game engine khỏi transport Socket.IO.
3. Thêm timer server-authoritative và event log/idempotency key.
4. Hoàn thiện state machine riêng cho Same Wavelength và Who Said It; Think Around the Number và Word Convergence đã có state machine realtime riêng.
5. Sau đó mới chuyển sang WebRTC voice ở Phase 6.

## Rủi ro hiện còn

- Room mất khi backend restart vì chưa có Redis.
- JSON user store chưa phù hợp production hoặc nhiều server instance.
- Frontend GitHub Pages cần HTTPS/WSS tunnel còn sống liên tục.
- Chưa có distributed rate limit hoặc room-code brute-force storage trong Redis.
- Chưa có CSRF/cookie OAuth vì auth hiện dùng bearer token trong localStorage.
