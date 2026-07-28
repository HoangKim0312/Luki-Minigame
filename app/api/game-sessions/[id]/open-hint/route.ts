import { env } from "cloudflare:workers";
import { challenges } from "@/lib/archive-data";
import { getRequestIdentity, jsonError } from "@/lib/api-utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getRequestIdentity();
  const session = await env.DB.prepare("SELECT challenge_id, hint_count, status, expires_at FROM game_sessions WHERE id = ? AND user_id = ?").bind(id, identity.id).first<{ challenge_id: string; hint_count: number; status: string; expires_at: string }>();
  if (!session) return jsonError("Session không tồn tại.", 404, "SESSION_NOT_FOUND");
  if (session.status !== "active" || Date.parse(session.expires_at) < Date.now()) return jsonError("Challenge đã hết hạn.", 409, "CHALLENGE_EXPIRED");
  const challenge = challenges.find((item) => item.id === session.challenge_id);
  if (!challenge) return jsonError("Challenge không còn khả dụng.", 404, "CHALLENGE_NOT_FOUND");
  const nextIndex = session.hint_count;
  if (nextIndex >= challenge.hints.length) return jsonError("Không còn hint để mở.", 409, "NO_MORE_HINTS");
  await env.DB.prepare("UPDATE game_sessions SET hint_count = hint_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").bind(id).run();
  return Response.json({ hint: { position: nextIndex + 1, content: challenge.hints[nextIndex] }, scoreAfterHint: [1000, 750, 500, 300, 100][Math.min(nextIndex + 1, 4)] });
}

