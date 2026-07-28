import { env } from "cloudflare:workers";
import { z } from "zod";
import { challenges } from "@/lib/archive-data";
import { isAcceptedAnswer } from "@/lib/answer";
import { getRequestIdentity, jsonError } from "@/lib/api-utils";

const submitSchema = z.object({
  challengeId: z.string().optional(),
  answer: z.string().trim().min(1).max(160),
  hintCount: z.number().int().min(0).max(20).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Đáp án không hợp lệ.", 422, "VALIDATION_ERROR");
  const identity = await getRequestIdentity();
  const challenge = challenges.find((item) => item.id === parsed.data.challengeId);
  if (!challenge) return jsonError("Challenge không tồn tại.", 404, "CHALLENGE_NOT_FOUND");

  const sessionId = id === "demo" ? `demo-${identity.id}-${challenge.id}` : id;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, 'user')").bind(identity.id, identity.email),
      env.DB.prepare("INSERT OR IGNORE INTO user_profiles (id, user_id, username) VALUES (?, ?, ?)").bind(`profile-${identity.id}`, identity.id, identity.name.slice(0, 40)),
      env.DB.prepare("INSERT OR IGNORE INTO game_sessions (id, user_id, challenge_id, status, expires_at, hint_count) VALUES (?, ?, ?, 'active', ?, ?)").bind(sessionId, identity.id, challenge.id, expiresAt, parsed.data.hintCount ?? 0),
    ]);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Database unavailable.", 503, "PERSISTENCE_UNAVAILABLE");
  }

  const existing = await env.DB.prepare("SELECT status, hint_count, expires_at, score, correct FROM game_sessions WHERE id = ? AND user_id = ?").bind(sessionId, identity.id).first<{ status: string; hint_count: number; expires_at: string; score: number; correct: number | null }>();
  if (!existing) return jsonError("Session không tồn tại.", 404, "SESSION_NOT_FOUND");
  if (existing.status !== "active") return jsonError("Challenge đã hoàn thành; reward không thể nhận lại.", 409, "ALREADY_COMPLETED");
  if (Date.parse(existing.expires_at) < Date.now()) return jsonError("Challenge đã hết hạn.", 409, "CHALLENGE_EXPIRED");

  const correct = isAcceptedAnswer(parsed.data.answer, [challenge.answer, ...challenge.aliases]);
  const hintCount = existing.hint_count;
  const score = correct ? [1000, 750, 500, 300, 100][Math.min(hintCount, 4)] : 0;
  const fragments = correct ? Math.max(1, 3 - hintCount) : 0;

  const claim = await env.DB.prepare(
    "UPDATE game_sessions SET status = 'completed', answer_submitted_at = CURRENT_TIMESTAMP, score = ?, correct = ?, reward_claimed_at = CASE WHEN ? > 0 THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND status = 'active' RETURNING id"
  ).bind(score, correct ? 1 : 0, fragments, sessionId, identity.id).first();
  if (!claim) return jsonError("Reward đã được xử lý trước đó.", 409, "REWARD_ALREADY_CLAIMED");

  if (correct) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO user_fragments (id, user_id, world_id, amount) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, world_id) DO UPDATE SET amount = amount + excluded.amount, updated_at = CURRENT_TIMESTAMP").bind(crypto.randomUUID(), identity.id, challenge.worldId, fragments),
      env.DB.prepare("UPDATE user_profiles SET archive_score = archive_score + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").bind(score, identity.id),
      env.DB.prepare("INSERT INTO leaderboard_entries (id, user_id, period_type, period_key, score) VALUES (?, ?, 'daily', date('now'), ?) ON CONFLICT(user_id, period_type, period_key) DO UPDATE SET score = score + excluded.score, updated_at = CURRENT_TIMESTAMP").bind(crypto.randomUUID(), identity.id, score),
    ]);
  }

  return Response.json({
    correct,
    score,
    reward: { fragments, worldId: challenge.worldId, claimed: correct },
    reveal: {
      correctAnswer: challenge.answer,
      aliases: challenge.aliases,
      title: challenge.media ? "Licensed demo media" : challenge.answer,
      artist: challenge.media ? "See attribution" : null,
      animeName: challenge.mode.includes("anime") ? challenge.answer : null,
      fullPlaybackAllowed: challenge.media?.fullPlaybackAllowed ?? false,
      fullPlaybackUrl: challenge.media?.fullPlaybackAllowed ? challenge.media.url : null,
      officialSourceUrl: challenge.media?.officialSourceUrl ?? null,
      attribution: challenge.media?.attribution ?? null,
    },
  });
}

