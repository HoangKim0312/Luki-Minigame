# AniGame Archive

**Guess. Restore. Collect.**

AniGame Archive là website mini-game và collection dành cho anime/game. Người chơi giải challenge để nhận fragment, dùng fragment phục hồi collectible, hoàn thành album, giữ daily streak và tranh hạng. Backend là nguồn sự thật cho đáp án, điểm và reward.

## MVP đã có

- Landing, Explore, Archive World, Play, Daily, Collection, Profile, Leaderboard và Admin dashboard responsive.
- Engine dùng chung cho Hint Ladder, Cropped Memory, Character Trail, Asset Link, Wrong Information, Anime Opening Guess, Game Soundtrack Guess và Anime Video Guess.
- Answer alias được chuẩn hóa chính xác: lowercase, bỏ dấu, dấu câu và khoảng trắng thừa; không fuzzy match rộng.
- Session backend có hạn dùng, chặn submit/reward trùng và tính điểm theo số hint.
- Fragment, collectible, collection progress và leaderboard dùng D1.
- `RemoteMediaImage` tải ảnh trực tiếp từ URL nguồn, có skeleton, fallback, lazy-load, blur/crop và không lưu binary vào database.
- AniList GraphQL và IGDB adapters chỉ chạy ở backend; kết quả search được cache ngắn hạn.
- Audio/video player phát media nguyên gốc, preview 5–30 giây, giới hạn replay, khóa seek trước reveal, hỗ trợ visible/blurred/covered và không tách audio khỏi video.
- Remote media, R2 upload/playback, temporary signed URL, attribution, license note, report/takedown và audit log.

## Stack

- Next.js 16, React 19, TypeScript strict, Tailwind CSS 4.
- Cloudflare D1 + Drizzle ORM cho dữ liệu quan hệ.
- Cloudflare R2 cho audio/video được cấp phép.
- Sites/Vinext cho Cloudflare Worker runtime.
- Zod cho input validation.
- Sites/ChatGPT identity headers cho đăng nhập; authorization luôn được kiểm tra lại ở API.

## Chạy local

Yêu cầu Node.js `>=22.13.0`.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Frontend mặc định chạy ở `http://localhost:3000`. Local Next preview có thể xem toàn bộ demo UI. Các thao tác D1/R2 cần chạy qua Sites/Vinext local runtime:

```bash
npm run db:seed
npm run build:sites
```

## Migration và seed

Schema Drizzle nằm tại `db/schema.ts`.

```bash
npm run db:generate
npm run db:seed
```

- `drizzle/0000_cuddly_vargas.sql`: 30 bảng, index, unique constraint và foreign key.
- `drizzle/0001_demo_seed.sql`: 6 Archive World, collectible, challenge, daily set và user demo.
- Khi schema thay đổi, tạo migration mới; không sửa migration đã áp dụng trên production.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build:sites
```

## API chính

### Public/user

- `GET /api/worlds`
- `GET /api/worlds/:slug`
- `GET /api/daily`
- `GET /api/leaderboard`
- `POST /api/game-sessions`
- `POST /api/game-sessions/:id/open-hint`
- `POST /api/game-sessions/:id/submit-answer`
- `POST /api/collectibles/:id/restore`
- `POST /api/report-content`
- `GET /api/media-storage/:key?token=...`

### Admin

- `GET /api/media/search?source=anilist|igdb&q=...`
- `POST /api/admin/worlds/import`
- `POST /api/admin/media-assets`
- `POST /api/admin/media-assets/upload-url`
- `PUT /api/media-storage/:key?token=...`

Mọi admin endpoint yêu cầu identity hợp lệ và email nằm trong `ADMIN_EMAILS`.

## Media provider

MVP hỗ trợ:

- `remote_audio`
- `remote_video`
- `uploaded_audio`
- `uploaded_video`

Kiến trúc `MediaProviderAdapter` tách validation, capability, playback config và attribution khỏi UI. Remote URL phải là HTTPS public; localhost, loopback, link-local và private IP bị chặn để giảm SSRF.

### Thêm remote audio/video

Vào `/admin`, chọn **Media assets**, nhập URL, type, visual mode, preview start, duration 5/10/15/20/30 giây, attribution và license note. API lưu URL/metadata, không tải file về application server.

### Object storage và signed playback

1. Client xin upload ticket tại `POST /api/admin/media-assets/upload-url`.
2. Backend tạo object key UUID và URL tạm 10 phút.
3. Client stream file vào R2; application không ghi file xuống local disk.
4. Playback URL dùng HMAC token có expiry và mode (`preview` hoặc `revealed`).
5. Preview mặc định hết hạn sau 5–10 phút; reveal nên dùng 30–60 phút.

Đặt `MEDIA_SIGNING_SECRET` bằng chuỗi ngẫu nhiên mạnh. Không dùng filename chứa đáp án.

### Full playback

- `canPlayFullAfterReveal=true`: gỡ blur/crop/overlay, mở controls và seek đầy đủ.
- `false`: chỉ replay preview nếu được phép và mở `officialSourceUrl`.
- Provider bắt buộc visible player không được che branding.

## Database

30 bảng gồm:

`users`, `user_profiles`, `media_sources`, `media_worlds`, `media_aliases`, `collectibles`, `collectible_variants`, `collection_sets`, `collection_set_items`, `user_fragments`, `user_collectibles`, `media_assets`, `challenges`, `challenge_hints`, `challenge_answers`, `challenge_options`, `game_sessions`, `game_session_hints`, `daily_challenges`, `daily_challenge_items`, `daily_results`, `leaderboard_entries`, `badges`, `titles`, `achievements`, `user_achievements`, `media_asset_reports`, `media_playback_sessions`, `media_provider_configs`, `audit_logs`.

Unique constraint bảo vệ user collectible, fragment balance, daily result, leaderboard period và reward khỏi trùng lặp.

## Bản quyền và takedown

- Không rip, download, chuyển video thành MP3 hoặc lấy riêng audio stream từ YouTube/Spotify.
- Demo audio là nguồn royalty-free SoundHelix; demo video là CC0 từ MDN và không đại diện nội dung anime/game thật.
- Media thật chỉ được publish sau khi có license note, attribution và approval.
- Report tạo record tại `media_asset_reports`. Admin có thể disable asset ngay; challenge mới không được bắt đầu nhưng lịch sử điểm hợp lệ vẫn được giữ.

## Giới hạn hiện tại

- IGDB cần token server-side và token phải được làm mới theo quy trình Twitch/IGDB.
- Cache nguồn ngoài hiện dùng cache process ngắn hạn; production lớn nên nối Upstash Redis.
- Upload URL tạm được ký tại application edge và stream thẳng vào R2 binding; nếu cần upload rất lớn, nên thay adapter bằng presigned S3-compatible R2 URL trực tiếp.
- Demo chưa có creator workflow, trading, marketplace, realtime multiplayer, fingerprinting hay automatic copyright detection.
- Media player HTML5 phụ thuộc CORS/range support của nguồn. Official embed cần adapter riêng theo điều khoản provider.

## Roadmap

1. Upstash cache + distributed rate limit.
2. Official embed adapters (Vimeo/Mux/Cloudflare Stream) theo capability.
3. Creator review workflow và moderation queue.
4. Achievement rules, collection cosmetics và profile editor hoàn chỉnh.
5. Integration tests chạy trên D1/R2 preview environment.
