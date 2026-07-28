import { env } from "cloudflare:workers";
import { jsonError } from "@/lib/api-utils";
import { verifyPlaybackToken } from "@/lib/media-signing";

export async function PUT(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = key.join("/");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!await verifyPlaybackToken(storageKey, token, "upload")) return jsonError("Upload URL đã hết hạn hoặc không hợp lệ.", 403, "INVALID_UPLOAD_TOKEN");
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^(audio|video)\/(mpeg|ogg|wav|mp4|webm)$/.test(contentType)) return jsonError("MIME type không được hỗ trợ.", 415, "UNSUPPORTED_MEDIA_TYPE");
  const declaredSize = Number(request.headers.get("x-archive-upload-size") ?? 0);
  if (!declaredSize || declaredSize > 250 * 1024 * 1024) return jsonError("Kích thước upload không hợp lệ.", 413, "UPLOAD_TOO_LARGE");
  await env.MEDIA.put(storageKey, request.body, { httpMetadata: { contentType }, customMetadata: { uploadedAt: new Date().toISOString() } });
  return Response.json({ uploaded: true, storageKey }, { status: 201 });
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = key.join("/");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!await verifyPlaybackToken(storageKey, token)) return jsonError("Playback URL đã hết hạn.", 403, "PLAYBACK_URL_EXPIRED");
  const object = await env.MEDIA.get(storageKey);
  if (!object) return jsonError("Media không tồn tại.", 404, "MEDIA_NOT_FOUND");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=60");
  headers.set("content-security-policy", "default-src 'none'");
  return new Response(object.body, { headers });
}

