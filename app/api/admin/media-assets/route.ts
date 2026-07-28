import { env } from "cloudflare:workers";
import { z } from "zod";
import { clampPreviewDuration, jsonError, requireAdminIdentity } from "@/lib/api-utils";
import { mediaProviderAdapters } from "@/lib/media-providers";

const schema = z.object({
  mediaType: z.enum(["audio", "video"]),
  sourceType: z.enum(["remote_audio", "remote_video", "uploaded_audio", "uploaded_video"]),
  sourceUrl: z.string().url(),
  title: z.string().min(1).max(160),
  artist: z.string().max(160).optional(),
  mediaCategory: z.string().min(1).max(60),
  previewStartSeconds: z.number().min(0).max(86400).default(0),
  previewDurationSeconds: z.number().default(30),
  canPlayFullAfterReveal: z.boolean().default(false),
  requiresVisiblePlayer: z.boolean().default(false),
  licenseType: z.string().min(2).max(80),
  licenseNote: z.string().min(5).max(2000),
  attributionText: z.string().min(2).max(1000),
  officialSourceUrl: z.string().url(),
});

export async function POST(request: Request) {
  const admin = await requireAdminIdentity();
  if (!admin) return jsonError("Cần quyền admin.", 403, "FORBIDDEN");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Metadata media không hợp lệ.", 422, "VALIDATION_ERROR");
  const adapter = mediaProviderAdapters[parsed.data.sourceType];
  if (!adapter) return jsonError("Provider chưa được hỗ trợ.", 422, "PROVIDER_UNSUPPORTED");
  const validation = await adapter.validateSource(parsed.data.sourceUrl);
  if (!validation.valid) return jsonError(validation.reason ?? "Remote URL không an toàn.", 422, "UNSAFE_REMOTE_URL");
  const capabilities = await adapter.getCapabilities(parsed.data);
  const duration = Math.min(clampPreviewDuration(parsed.data.previewDurationSeconds), capabilities.maxPreviewSeconds ?? 30);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO media_assets (id, media_type, source_type, provider, source_url, playback_url, title, artist, media_category, preview_start_seconds, preview_duration_seconds, can_preview, can_play_full_after_reveal, requires_external_full_playback, requires_visible_player, max_preview_seconds, license_type, license_note, attribution_text, official_source_url, uploaded_by, approval_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', 'draft')")
      .bind(id, parsed.data.mediaType, parsed.data.sourceType, adapter.providerName, parsed.data.sourceUrl, parsed.data.sourceUrl, parsed.data.title, parsed.data.artist ?? null, parsed.data.mediaCategory, parsed.data.previewStartSeconds, duration, capabilities.canPlayFullAfterReveal ? 1 : 0, capabilities.requiresExternalFullPlayback ? 1 : 0, capabilities.requiresVisiblePlayer ? 1 : 0, capabilities.maxPreviewSeconds, parsed.data.licenseType, parsed.data.licenseNote, parsed.data.attributionText, parsed.data.officialSourceUrl, admin.id),
    env.DB.prepare("INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'create', 'media_asset', ?, ?)").bind(crypto.randomUUID(), admin.id, id, JSON.stringify({ sourceType: parsed.data.sourceType })),
  ]);
  return Response.json({ asset: { id, ...parsed.data, previewDurationSeconds: duration, capabilities, approvalStatus: "needs_review", status: "draft" } }, { status: 201 });
}

