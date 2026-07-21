/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const roomDirectoryPattern = /^\/api\/room-directory\/([A-Z0-9]{6})$/i;
const roomDirectoryCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function roomDirectoryResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: roomDirectoryCors });
}

async function handleRoomDirectory(request: Request, env: Env, code: string) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: roomDirectoryCors });
  const now = Date.now();
  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT backend_url AS backendUrl FROM room_directory WHERE code = ? AND expires_at > ?"
    ).bind(code, now).first<{ backendUrl: string }>();
    return row ? roomDirectoryResponse(row) : roomDirectoryResponse({ error: "Room not found" }, 404);
  }
  if (request.method === "POST") {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_000) return roomDirectoryResponse({ error: "Payload too large" }, 413);
    const body = await request.json() as { backendUrl?: string };
    let backendUrl: string;
    try {
      const parsed = new URL(body.backendUrl || "");
      if (parsed.protocol !== "https:") throw new Error("HTTPS required");
      backendUrl = parsed.origin;
    } catch {
      return roomDirectoryResponse({ error: "Valid HTTPS backend URL required" }, 400);
    }
    try {
      const verification = await fetch(`${backendUrl}/api/rooms/${code}`);
      if (!verification.ok) return roomDirectoryResponse({ error: "Room is not reachable" }, 422);
    } catch {
      return roomDirectoryResponse({ error: "Backend is not reachable" }, 502);
    }
    const expiresAt = now + 6 * 60 * 60 * 1000;
    await env.DB.prepare(
      "INSERT INTO room_directory (code, backend_url, expires_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET backend_url = excluded.backend_url, expires_at = excluded.expires_at, updated_at = excluded.updated_at"
    ).bind(code, backendUrl, expiresAt, now).run();
    return roomDirectoryResponse({ code, backendUrl, expiresAt }, 201);
  }
  return roomDirectoryResponse({ error: "Method not allowed" }, 405);
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const roomDirectoryMatch = url.pathname.match(roomDirectoryPattern);
    if (roomDirectoryMatch) return handleRoomDirectory(request, env, roomDirectoryMatch[1].toUpperCase());

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
