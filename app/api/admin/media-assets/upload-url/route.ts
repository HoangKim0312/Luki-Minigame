import { z } from "zod";
import { createPlaybackToken } from "@/lib/media-signing";
import { jsonError, requireAdminIdentity } from "@/lib/api-utils";

const schema = z.object({ mediaType: z.enum(["audio", "video"]), mimeType: z.enum(["audio/mpeg", "audio/ogg", "audio/wav", "video/mp4", "video/webm"]), size: z.number().int().positive().max(250 * 1024 * 1024) });

export async function POST(request: Request) {
  if (!await requireAdminIdentity()) return jsonError("Cần quyền admin.", 403, "FORBIDDEN");
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("File phải là audio/video hợp lệ và không vượt quá 250 MB.", 422, "INVALID_UPLOAD");
  const extension = parsed.data.mimeType.split("/")[1].replace("mpeg", "mp3");
  const storageKey = `media/${crypto.randomUUID()}.${extension}`;
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const token = await createPlaybackToken(storageKey, expiresAt, "upload");
  return Response.json({
    method: "PUT",
    uploadUrl: `/api/media-storage/${encodeURIComponent(storageKey)}?token=${encodeURIComponent(token)}`,
    storageKey,
    expiresAt: new Date(expiresAt).toISOString(),
    headers: { "content-type": parsed.data.mimeType, "x-archive-upload-size": String(parsed.data.size) },
  });
}

