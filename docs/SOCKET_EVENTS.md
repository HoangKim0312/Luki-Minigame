# Socket.IO events

Types dùng chung nằm tại `lib/realtime.ts`. Server chỉ gửi nội dung đáp án trong `revealedAnswers` khi phase là `reveal` hoặc `finished`.

## Client → server

| Event | Mục đích | Quyền/kiểm tra |
| --- | --- | --- |
| `room:create` | Tạo room và guest session | Zod, game published |
| `room:join` | Join hoặc resume bằng token | Mã 6 ký tự, room capacity |
| `room:ready` | Ready/unready | Chỉ lobby |
| `room:start` | Bắt đầu game | Host, đủ người và ready |
| `room:add-demo` | Thêm bot kiểm thử | Host, chỉ lobby |
| `game:submit-answer` | Gửi đáp án riêng | Đúng phase, một lần mỗi vòng |
| `game:reveal` | Lật bài và chấm điểm | Host, mọi người đã trả lời |
| `game:next` | Sang vòng/game end | Host, đúng phase |
| `game:number-guess` | Đoán số bí mật của một người khác | 0–99, không tự đoán mình |
| `game:number-reveal` | Lật số sau khi bị đoán đúng | Người bị đoán hoặc host |
| `game:number-next` | Phát số mới cho mọi người | Sau reveal, không giới hạn vòng |
| `game:convergence-submit` | Gửi kín từ liên tưởng | Đúng 2 người, một lần mỗi bước |
| `game:convergence-next` | Dùng hai đáp án khác nhau làm cặp từ mới | Sau khi cả hai đáp án được lật |
| `game:convergence-restart` | Phát cặp từ ngẫu nhiên mới sau khi hội tụ | Chỉ host |

Mọi event mutation đều dùng acknowledgement `{ ok, data | error }`.

## Server → client

| Event | Nội dung |
| --- | --- |
| `server:room-state` | Public state, players, ready, score, answered IDs, phase |
| `server:private-state` | Targeted player ID, resume token và private answer của chính player |
| `server:game-event` | Event log an toàn cho UI |
| `server:error` | Lỗi có thể hiển thị |

## Reconnection

Client lưu `luki-resume-{ROOM_CODE}` trên thiết bị. Khi Socket.IO reconnect hoặc trang refresh, client gửi token trong `room:join`. Server gắn socket mới vào cùng player và trả lại public/private state. Người chơi disconnected được giữ 30 giây; host migration xảy ra sau grace period.

Với **Điểm Giao Nhau**, server chỉ công khai hai đáp án sau khi cả hai người đã gửi. Khi so khớp, server chuẩn hóa chữ hoa/thường, dấu tiếng Việt (kể cả `đ`), dấu câu và khoảng trắng.
