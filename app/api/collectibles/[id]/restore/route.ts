import { env } from "cloudflare:workers";
import { collectibles } from "@/lib/archive-data";
import { getRequestIdentity, jsonError } from "@/lib/api-utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getRequestIdentity();
  if (!identity.authenticated) return jsonError("Đăng nhập để lưu collection.", 401, "UNAUTHORIZED");
  const collectible = collectibles.find((item) => item.id === id);
  if (!collectible) return jsonError("Collectible không tồn tại.", 404, "COLLECTIBLE_NOT_FOUND");
  const balance = await env.DB.prepare("SELECT amount FROM user_fragments WHERE user_id = ? AND world_id = ?").bind(identity.id, collectible.worldId).first<{ amount: number }>();
  if ((balance?.amount ?? 0) < collectible.cost) return jsonError("Không đủ fragment.", 409, "INSUFFICIENT_FRAGMENTS");
  const existing = await env.DB.prepare("SELECT id FROM user_collectibles WHERE user_id = ? AND collectible_id = ?").bind(identity.id, id).first();
  if (existing) return jsonError("Collectible đã được restore.", 409, "ALREADY_RESTORED");
  await env.DB.batch([
    env.DB.prepare("UPDATE user_fragments SET amount = amount - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND world_id = ? AND amount >= ?").bind(collectible.cost, identity.id, collectible.worldId, collectible.cost),
    env.DB.prepare("INSERT INTO user_collectibles (id, user_id, collectible_id) VALUES (?, ?, ?)").bind(crypto.randomUUID(), identity.id, id),
  ]);
  return Response.json({ restored: true, collectible, remainingFragments: (balance?.amount ?? 0) - collectible.cost });
}

