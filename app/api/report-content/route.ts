import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonError } from "@/lib/api-utils";

const schema = z.object({ mediaAssetId: z.string().min(1).max(100), reporterEmail: z.string().email().max(200), reason: z.string().min(2).max(120), details: z.string().min(5).max(3000), evidenceUrl: z.string().url().optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Báo cáo không hợp lệ.", 422, "VALIDATION_ERROR");
  const asset = await env.DB.prepare("SELECT id FROM media_assets WHERE id = ?").bind(parsed.data.mediaAssetId).first();
  if (!asset) return jsonError("Media asset không tồn tại.", 404, "MEDIA_NOT_FOUND");
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO media_asset_reports (id, media_asset_id, reporter_email, reason, details, evidence_url, status) VALUES (?, ?, ?, ?, ?, ?, 'open')").bind(id, parsed.data.mediaAssetId, parsed.data.reporterEmail, parsed.data.reason, parsed.data.details, parsed.data.evidenceUrl ?? null).run();
  return Response.json({ reportId: id, status: "open" }, { status: 201 });
}

