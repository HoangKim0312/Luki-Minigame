import { env } from "cloudflare:workers";
import { z } from "zod";
import { challenges } from "@/lib/archive-data";
import { getRequestIdentity, jsonError } from "@/lib/api-utils";

const startSchema = z.object({ challengeId: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("challengeId không hợp lệ.", 422, "VALIDATION_ERROR");
  const challenge = challenges.find((item) => item.id === parsed.data.challengeId);
  if (!challenge) return jsonError("Challenge không tồn tại hoặc đã bị tắt.", 404, "CHALLENGE_NOT_FOUND");
  const identity = await getRequestIdentity();
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  try {
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, 'user')").bind(identity.id, identity.email),
      env.DB.prepare("INSERT OR IGNORE INTO user_profiles (id, user_id, username) VALUES (?, ?, ?)").bind(`profile-${identity.id}`, identity.id, identity.name.slice(0, 40)),
      env.DB.prepare("INSERT INTO game_sessions (id, user_id, challenge_id, status, expires_at) VALUES (?, ?, ?, 'active', ?)").bind(sessionId, identity.id, challenge.id, expiresAt),
    ]);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Database unavailable.", 503, "PERSISTENCE_UNAVAILABLE");
  }

  return Response.json({
    sessionId,
    challengeType: challenge.mode,
    prompt: challenge.prompt,
    options: challenge.options,
    hintCount: challenge.hints.length,
    media: challenge.media ? {
      playbackUrl: challenge.media.url,
      mediaType: challenge.media.type,
      previewStartSeconds: challenge.media.start,
      previewDurationSeconds: Math.min(30, challenge.media.duration),
      visualMode: challenge.media.visualMode,
      maxReplays: challenge.media.maxReplays,
    } : undefined,
    image: challenge.image,
    timeLimitSeconds: 45,
    expiresAt,
  }, { status: 201 });
}

