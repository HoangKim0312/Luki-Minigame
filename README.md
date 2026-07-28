# AniGame Archive

**Guess. Restore. Collect.**

AniGame Archive là website mini-game và collection dành cho anime/game. Kiến trúc production giữ nguyên nền tảng triển khai ban đầu của repository:

```text
GitHub Pages (Next.js static frontend)
            ↓ HTTPS REST
Railway (authoritative Node.js backend)
            ↓
Supabase Auth + PostgreSQL + Storage
```

Project không còn phụ thuộc ChatGPT Sites, Cloudflare D1 hoặc R2.

## Tính năng

- Landing, Explore, Archive World, Play, Daily, Collection, Profile, Leaderboard và Admin responsive.
- Hint Ladder, Cropped Memory, Character Trail, Asset Link, Wrong Information.
- Anime Opening Guess, Game Soundtrack Guess và Anime Video Guess dùng chung media player.
- Answer alias chuẩn hóa chính xác; không fuzzy match rộng.
- Backend Railway xác minh session, hint, answer, score và reward.
- PostgreSQL function cộng fragment/score và restore collectible trong transaction.
- Supabase Auth cho đăng ký, đăng nhập và refresh token.
- AniList GraphQL, IGDB và AnimeThemes adapters chỉ chạy ở backend.
- Supabase Storage private bucket cho audio/video được cấp phép.
- Preview media 5–30 giây, replay limit, blur/covered mode và reveal.
- Attribution, license note, content report và audit log.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Mở terminal thứ hai:

```bash
npm run dev:server
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8787`
- Health check: `http://localhost:8787/health`

## Supabase

Tạo project Supabase, điền các biến server-only:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
SUPABASE_MEDIA_BUCKET=licensed-media
```

Chạy migration:

```bash
npm run migrate
```

Migration [202607280001_anigame_archive.sql](supabase/migrations/202607280001_anigame_archive.sql) tạo schema, index, RLS, seed demo, private Storage bucket và các PostgreSQL function:

- `award_challenge_reward`
- `restore_collectible`

Sau khi đăng ký tài khoản admin:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

## Deploy frontend lên GitHub Pages

Workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) chạy khi push `main`.

Nó sử dụng:

```bash
npm ci
npm run build:pages
```

Static export nằm trong `out/`. Frontend production gọi:

```text
https://luki-minigame-production.up.railway.app
```

qua biến `NEXT_PUBLIC_API_URL` trong workflow. Nếu Railway domain thay đổi, cập nhật biến này.

## Deploy backend lên Railway

Railway dùng [Dockerfile](Dockerfile) và [railway.json](railway.json).

Các biến cần đặt trên Railway:

```dotenv
PORT=8787
ALLOWED_ORIGINS=https://hoangkim0312.github.io
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_MEDIA_BUCKET=licensed-media
IGDB_CLIENT_ID=...
IGDB_ACCESS_TOKEN=...
```

Railway kiểm tra `/health`. Backend lắng nghe trên `0.0.0.0` và `PORT`.

## API

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Gameplay

- `GET /api/worlds`
- `GET /api/worlds/:slug`
- `GET /api/daily`
- `GET /api/leaderboard`
- `POST /api/game-sessions`
- `POST /api/game-sessions/:id/open-hint`
- `POST /api/game-sessions/:id/submit-answer`
- `POST /api/collectibles/:id/restore`

### Admin/media

- `GET /api/media/search`
- `POST /api/admin/worlds/import`
- `POST /api/admin/media-assets`
- `POST /api/admin/media-assets/upload-url`
- `POST /api/report-content`

Admin endpoints kiểm tra JWT Supabase và role từ PostgreSQL.

## Audio/video

- Remote media chỉ lưu URL và metadata.
- Upload được gửi đến private Supabase Storage bucket bằng signed upload URL.
- Không lưu file vào Railway filesystem.
- Không rip, tách audio, chuyển MP4 thành MP3 hoặc download từ YouTube/Spotify.
- Opening/ending được ánh xạ qua AnimeThemes theo tên/alternative title và năm phát hành. Video WebM được stream nguyên bản từ URL do API trả về; không tách audio.
- Admin dùng tab `AnimeThemes` để tìm OP/ED, chọn đúng Archive World và import.
- Backend từ chối mapping sai anime/năm; database chỉ cho media challenge hoạt động khi asset cùng World, đúng category, đã approved và có attribution/official source.
- Nếu không được phép full playback, reveal chỉ mở official source.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build:pages
```

## Biến môi trường

Xem [.env.example](.env.example). Không đưa `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` hoặc IGDB token vào biến `NEXT_PUBLIC_*`.

## Giới hạn

- IGDB live search cần token hợp lệ từ Twitch/IGDB.
- Rate limiting hiện áp dụng theo process Railway; production nhiều replica nên nối Upstash Redis.
- Official embeds cần adapter riêng theo điều khoản từng provider.
- Chưa có trading, marketplace, realtime multiplayer hoặc automatic copyright detection.
