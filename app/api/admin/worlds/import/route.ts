import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonError, requireAdminIdentity } from "@/lib/api-utils";
import { sourceAdapters } from "@/lib/source-adapters";

const schema = z.object({ source: z.enum(["anilist", "igdb"]), sourceId: z.string().min(1).max(40), status: z.enum(["draft", "published"]).default("draft") });
const slugify = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

export async function POST(request: Request) {
  const admin = await requireAdminIdentity();
  if (!admin) return jsonError("Cần quyền admin.", 403, "FORBIDDEN");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Dữ liệu import không hợp lệ.", 422, "VALIDATION_ERROR");
  try {
    const item = await sourceAdapters[parsed.data.source].getMediaDetails(parsed.data.sourceId);
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO media_worlds (id, source, source_id, type, title, slug, alternative_titles, cover_image_url, banner_image_url, description, genres, release_year, attribution, license_note, metadata, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source, source_id) DO UPDATE SET title = excluded.title, cover_image_url = excluded.cover_image_url, banner_image_url = excluded.banner_image_url, description = excluded.description, genres = excluded.genres, metadata = excluded.metadata, updated_at = CURRENT_TIMESTAMP")
        .bind(id, item.source, item.sourceId, item.type, item.title, slugify(item.title), JSON.stringify(item.alternativeTitles), item.coverImageUrl, item.bannerImageUrl, item.description, JSON.stringify(item.genres), item.releaseYear, item.attribution, "Remote metadata imported under source API terms; verify before publishing.", JSON.stringify(item.metadata), parsed.data.status),
      env.DB.prepare("INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'import', 'media_world', ?, ?)").bind(crypto.randomUUID(), admin.id, id, JSON.stringify({ source: item.source, sourceId: item.sourceId })),
    ]);
    return Response.json({ world: { ...item, id, slug: slugify(item.title), status: parsed.data.status } }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Import thất bại.", 503, "IMPORT_FAILED");
  }
}

