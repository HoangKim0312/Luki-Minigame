import { sourceAdapters } from "@/lib/source-adapters";
import { jsonError, requireAdminIdentity } from "@/lib/api-utils";

const cache = new Map<string, { expiresAt: number; data: unknown }>();

export async function GET(request: Request) {
  if (!await requireAdminIdentity()) return jsonError("Cần quyền admin.", 403, "FORBIDDEN");
  const url = new URL(request.url);
  const source = url.searchParams.get("source") as keyof typeof sourceAdapters | null;
  const query = url.searchParams.get("q")?.trim();
  if (!source || !sourceAdapters[source]) return jsonError("source phải là anilist hoặc igdb.", 422, "VALIDATION_ERROR");
  if (!query || query.length < 2 || query.length > 80) return jsonError("Từ khóa phải dài 2–80 ký tự.", 422, "VALIDATION_ERROR");
  const key = `${source}:${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Response.json({ source, results: hit.data, cached: true });
  try {
    const results = await sourceAdapters[source].searchMedia(query);
    cache.set(key, { expiresAt: Date.now() + 20 * 60 * 1000, data: results });
    return Response.json({ source, results, cached: false });
  } catch (error) {
    if (hit) return Response.json({ source, results: hit.data, cached: true, stale: true });
    return jsonError(error instanceof Error ? error.message : "Nguồn ngoài tạm thời không khả dụng.", 503, "UPSTREAM_UNAVAILABLE");
  }
}

