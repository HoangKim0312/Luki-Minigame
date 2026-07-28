import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { challenges, collectibles, worlds } from "../lib/archive-data";
import { isAcceptedAnswer } from "../lib/answer";
import { mediaProviderAdapters } from "../lib/media-providers";
import { sourceAdapters } from "../lib/source-adapters";
import {
  createSignedUploadUrl,
  createSupabaseAccount,
  getSupabaseProfile,
  getSupabaseUser,
  isSupabaseConfigured,
  refreshSupabaseSession,
  signInWithSupabase,
  supabaseRest,
} from "./supabase";

const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,https://hoangkim0312.github.io")
  .split(",").map((value) => value.trim()).filter(Boolean);
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const sourceCache = new Map<string, { expiresAt: number; data: unknown }>();

type Identity = { id: string; email: string; name: string; role: "admin" | "user" | "creator" };
type Json = Record<string, unknown> | unknown[];

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Archive-Upload-Size");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,OPTIONS");
}

function json(res: ServerResponse, status: number, body: Json) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function error(res: ServerResponse, status: number, message: string, code = "BAD_REQUEST") {
  return json(res, status, { error: { code, message } });
}

function rateLimit(req: IncomingMessage, res: ServerResponse, scope: string, limit: number, windowMs: number) {
  const address = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) {
    res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    error(res, 429, "Bạn thao tác quá nhanh. Hãy thử lại sau.", "RATE_LIMITED");
    return false;
  }
  current.count += 1;
  return true;
}

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > 1_000_000) throw new Error("Payload quá lớn.");
    chunks.push(value);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown : {};
}

function bearer(req: IncomingMessage) {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

async function identity(req: IncomingMessage): Promise<Identity | null> {
  const token = bearer(req);
  if (!token || !isSupabaseConfigured()) return null;
  const user = await getSupabaseUser(token);
  if (!user?.id || !user.email) return null;
  const profile = await getSupabaseProfile(user.id);
  if (!profile) return null;
  return { id: user.id, email: user.email, name: profile.username, role: profile.role };
}

async function requireUser(req: IncomingMessage, res: ServerResponse) {
  const user = await identity(req);
  if (!user) error(res, 401, "Bạn cần đăng nhập.", "UNAUTHORIZED");
  return user;
}

async function requireAdmin(req: IncomingMessage, res: ServerResponse) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    error(res, 403, "Cần quyền admin.", "FORBIDDEN");
    return null;
  }
  return user;
}

function sessionPayload(session: Awaited<ReturnType<typeof signInWithSupabase>>, profile: Awaited<ReturnType<typeof getSupabaseProfile>>) {
  if (!profile) throw new Error("Không tìm thấy profile.");
  return {
    token: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      id: session.user.id,
      name: profile.username,
      email: session.user.email,
      role: profile.role === "admin" ? "admin" : "player",
      avatar: profile.avatar_url,
      archiveScore: profile.archive_score,
      streak: profile.streak,
    },
  };
}

async function authRoutes(req: IncomingMessage, res: ServerResponse, pathname: string) {
  if (pathname === "/api/auth/register" && req.method === "POST") {
    const input = z.object({ email: z.string().email(), password: z.string().min(8).max(100), displayName: z.string().trim().min(1).max(40) }).parse(await body(req));
    const session = await createSupabaseAccount(input);
    return json(res, 201, sessionPayload(session, await getSupabaseProfile(session.user.id)));
  }
  if (pathname === "/api/auth/login" && req.method === "POST") {
    const input = z.object({ email: z.string().email(), password: z.string().min(1).max(100) }).parse(await body(req));
    const session = await signInWithSupabase(input.email, input.password);
    return json(res, 200, sessionPayload(session, await getSupabaseProfile(session.user.id)));
  }
  if (pathname === "/api/auth/refresh" && req.method === "POST") {
    const input = z.object({ refreshToken: z.string().min(1) }).parse(await body(req));
    const session = await refreshSupabaseSession(input.refreshToken);
    return json(res, 200, sessionPayload(session, await getSupabaseProfile(session.user.id)));
  }
  if (pathname === "/api/auth/me" && req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    const profile = await getSupabaseProfile(user.id);
    return json(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role === "admin" ? "admin" : "player", avatar: profile?.avatar_url, archiveScore: profile?.archive_score ?? 0, streak: profile?.streak ?? 0 });
  }
  return false;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  cors(req, res);
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/health") return json(res, 200, { ok: true, service: "anigame-archive-api", database: isSupabaseConfigured() ? "supabase" : "unconfigured" });
  const authResult = await authRoutes(req, res, pathname);
  if (authResult !== false) return;

  if (pathname === "/api/worlds" && req.method === "GET") return json(res, 200, { worlds });
  if (pathname.startsWith("/api/worlds/") && req.method === "GET") {
    const slug = decodeURIComponent(pathname.slice("/api/worlds/".length));
    const world = worlds.find((item) => item.slug === slug);
    if (!world) return error(res, 404, "Archive World không tồn tại.", "WORLD_NOT_FOUND");
    return json(res, 200, { world, collectibles: collectibles.filter((item) => item.worldId === world.id), challenges: challenges.filter((item) => item.worldId === world.id).map((item) => ({ id: item.id, mode: item.mode, label: item.label, prompt: item.prompt })) });
  }
  if (pathname === "/api/daily" && req.method === "GET") {
    const date = new Date().toISOString().slice(0, 10);
    return json(res, 200, { id: `daily-${date}`, date, timezone: "UTC", challenges: challenges.slice(0, 5).map((item) => ({ id: item.id, mode: item.mode, label: item.label, prompt: item.prompt })) });
  }
  if (pathname === "/api/leaderboard" && req.method === "GET") {
    const entries = await supabaseRest<Array<{ username: string; archive_score: number; streak: number }>>("profiles?select=username,archive_score,streak&order=archive_score.desc&limit=50");
    return json(res, 200, { entries: entries.map((entry, index) => ({ rank: index + 1, name: entry.username, score: entry.archive_score, streak: entry.streak })) });
  }
  if (pathname === "/api/game-sessions" && req.method === "POST") {
    if (!rateLimit(req, res, "session-start", 30, 60_000)) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const input = z.object({ challengeId: z.string().min(1) }).parse(await body(req));
    const challenge = challenges.find((item) => item.id === input.challengeId);
    if (!challenge) return error(res, 404, "Challenge không tồn tại.", "CHALLENGE_NOT_FOUND");
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    await supabaseRest("game_sessions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id, user_id: user.id, challenge_id: challenge.id, status: "active", expires_at: expiresAt }) });
    return json(res, 201, { sessionId: id, challengeType: challenge.mode, prompt: challenge.prompt, options: challenge.options, media: challenge.media ? { playbackUrl: challenge.media.url, mediaType: challenge.media.type, previewStartSeconds: challenge.media.start, previewDurationSeconds: Math.min(30, challenge.media.duration), visualMode: challenge.media.visualMode, maxReplays: challenge.media.maxReplays } : undefined, timeLimitSeconds: 45, expiresAt });
  }

  const hintMatch = pathname.match(/^\/api\/game-sessions\/([^/]+)\/open-hint$/);
  if (hintMatch && req.method === "POST") {
    if (!rateLimit(req, res, "open-hint", 60, 60_000)) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const rows = await supabaseRest<Array<{ id: string; challenge_id: string; hint_count: number; status: string; expires_at: string }>>(`game_sessions?id=eq.${encodeURIComponent(hintMatch[1])}&user_id=eq.${user.id}&select=id,challenge_id,hint_count,status,expires_at&limit=1`);
    const session = rows[0];
    if (!session) return error(res, 404, "Session không tồn tại.", "SESSION_NOT_FOUND");
    if (session.status !== "active" || Date.parse(session.expires_at) < Date.now()) return error(res, 409, "Challenge đã hết hạn.", "CHALLENGE_EXPIRED");
    const challenge = challenges.find((item) => item.id === session.challenge_id);
    if (!challenge || session.hint_count >= challenge.hints.length) return error(res, 409, "Không còn hint.", "NO_MORE_HINTS");
    await supabaseRest(`game_sessions?id=eq.${session.id}&status=eq.active`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ hint_count: session.hint_count + 1 }) });
    return json(res, 200, { hint: { position: session.hint_count + 1, content: challenge.hints[session.hint_count] }, scoreAfterHint: [1000, 750, 500, 300, 100][Math.min(session.hint_count + 1, 4)] });
  }

  const submitMatch = pathname.match(/^\/api\/game-sessions\/([^/]+)\/submit-answer$/);
  if (submitMatch && req.method === "POST") {
    if (!rateLimit(req, res, "submit-answer", 30, 60_000)) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const input = z.object({ answer: z.string().trim().min(1).max(160) }).parse(await body(req));
    const rows = await supabaseRest<Array<{ id: string; challenge_id: string; hint_count: number; status: string; expires_at: string }>>(`game_sessions?id=eq.${encodeURIComponent(submitMatch[1])}&user_id=eq.${user.id}&select=id,challenge_id,hint_count,status,expires_at&limit=1`);
    const session = rows[0];
    if (!session) return error(res, 404, "Session không tồn tại.", "SESSION_NOT_FOUND");
    if (session.status !== "active") return error(res, 409, "Challenge đã hoàn thành.", "ALREADY_COMPLETED");
    if (Date.parse(session.expires_at) < Date.now()) return error(res, 409, "Challenge đã hết hạn.", "CHALLENGE_EXPIRED");
    const challenge = challenges.find((item) => item.id === session.challenge_id);
    if (!challenge) return error(res, 404, "Challenge không tồn tại.", "CHALLENGE_NOT_FOUND");
    const correct = isAcceptedAnswer(input.answer, [challenge.answer, ...challenge.aliases]);
    const score = correct ? [1000, 750, 500, 300, 100][Math.min(session.hint_count, 4)] : 0;
    const fragments = correct ? Math.max(1, 3 - session.hint_count) : 0;
    await supabaseRest("rpc/complete_challenge_session", {
      method: "POST",
      body: JSON.stringify({ p_session_id: session.id, p_user_id: user.id, p_world_id: challenge.worldId, p_score: score, p_fragments: fragments, p_correct: correct }),
    });
    return json(res, 200, { correct, score, reward: { fragments, worldId: challenge.worldId }, reveal: { correctAnswer: challenge.answer, fullPlaybackAllowed: challenge.media?.fullPlaybackAllowed ?? false, fullPlaybackUrl: challenge.media?.fullPlaybackAllowed ? challenge.media.url : null, officialSourceUrl: challenge.media?.officialSourceUrl ?? null, attribution: challenge.media?.attribution ?? null } });
  }

  const restoreMatch = pathname.match(/^\/api\/collectibles\/([^/]+)\/restore$/);
  if (restoreMatch && req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await supabaseRest<{ restored: boolean; remaining_fragments: number }>("rpc/restore_collectible", { method: "POST", body: JSON.stringify({ p_user_id: user.id, p_collectible_id: decodeURIComponent(restoreMatch[1]) }) });
    return json(res, 200, result);
  }

  if (pathname === "/api/media/search" && req.method === "GET") {
    if (!rateLimit(req, res, "media-search", 20, 60_000)) return;
    if (!await requireAdmin(req, res)) return;
    const source = url.searchParams.get("source") as keyof typeof sourceAdapters | null;
    const query = url.searchParams.get("q")?.trim();
    if (!source || !sourceAdapters[source] || !query) return error(res, 422, "source hoặc query không hợp lệ.", "VALIDATION_ERROR");
    const cacheKey = `${source}:${query.toLowerCase()}`;
    const cached = sourceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return json(res, 200, { source, results: cached.data, cached: true });
    const results = await sourceAdapters[source].searchMedia(query);
    sourceCache.set(cacheKey, { expiresAt: Date.now() + 20 * 60_000, data: results });
    return json(res, 200, { source, results, cached: false });
  }

  if (pathname === "/api/admin/worlds/import" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = z.object({ source: z.enum(["anilist", "igdb"]), sourceId: z.string().min(1), status: z.enum(["draft", "published"]).default("draft") }).parse(await body(req));
    const item = await sourceAdapters[input.source].getMediaDetails(input.sourceId);
    const slug = item.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const record = { id: randomUUID(), source: item.source, source_id: item.sourceId, type: item.type, title: item.title, slug, alternative_titles: item.alternativeTitles, cover_image_url: item.coverImageUrl, banner_image_url: item.bannerImageUrl, description: item.description, genres: item.genres, release_year: item.releaseYear, attribution: item.attribution, license_note: "Remote metadata imported under source API terms.", metadata: item.metadata, status: input.status };
    await supabaseRest("media_worlds?on_conflict=source,source_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(record) });
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_user_id: admin.id, action: "import", entity_type: "media_world", entity_id: record.id, metadata: { source: item.source, sourceId: item.sourceId } }) });
    return json(res, 201, { world: record });
  }

  if (pathname === "/api/admin/media-assets/upload-url" && req.method === "POST") {
    if (!await requireAdmin(req, res)) return;
    const input = z.object({ mediaType: z.enum(["audio", "video"]), mimeType: z.enum(["audio/mpeg", "audio/ogg", "audio/wav", "video/mp4", "video/webm"]), size: z.number().int().positive().max(250 * 1024 * 1024) }).parse(await body(req));
    const extension = input.mimeType.split("/")[1].replace("mpeg", "mp3");
    const storageKey = `media/${randomUUID()}.${extension}`;
    const signed = await createSignedUploadUrl(process.env.SUPABASE_MEDIA_BUCKET || "licensed-media", storageKey);
    const uploadUrl = signed.url.startsWith("http") ? signed.url : `${process.env.SUPABASE_URL?.replace(/\/$/, "")}/storage/v1${signed.url.startsWith("/") ? "" : "/"}${signed.url}`;
    return json(res, 200, { method: "PUT", uploadUrl, token: signed.token, storageKey, expiresIn: 7200 });
  }

  if (pathname === "/api/admin/media-assets" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = z.object({ mediaType: z.enum(["audio", "video"]), sourceType: z.enum(["remote_audio", "remote_video", "uploaded_audio", "uploaded_video"]), sourceUrl: z.string().url(), title: z.string().min(1), mediaCategory: z.string().min(1), previewStartSeconds: z.number().min(0).default(0), previewDurationSeconds: z.number().min(5).max(30), canPlayFullAfterReveal: z.boolean().default(false), licenseType: z.string().min(2), licenseNote: z.string().min(5), attributionText: z.string().min(2), officialSourceUrl: z.string().url() }).parse(await body(req));
    const adapter = mediaProviderAdapters[input.sourceType];
    const validation = await adapter.validateSource(input.sourceUrl);
    if (!validation.valid) return error(res, 422, validation.reason || "URL không an toàn.", "UNSAFE_REMOTE_URL");
    const id = randomUUID();
    await supabaseRest("media_assets", { method: "POST", body: JSON.stringify({ id, media_type: input.mediaType, source_type: input.sourceType, provider: adapter.providerName, source_url: input.sourceUrl, playback_url: input.sourceUrl, title: input.title, media_category: input.mediaCategory, preview_start_seconds: input.previewStartSeconds, preview_duration_seconds: input.previewDurationSeconds, can_preview: true, can_play_full_after_reveal: input.canPlayFullAfterReveal, requires_external_full_playback: !input.canPlayFullAfterReveal, max_preview_seconds: 30, license_type: input.licenseType, license_note: input.licenseNote, attribution_text: input.attributionText, official_source_url: input.officialSourceUrl, uploaded_by: admin.id, approval_status: "needs_review", status: "draft" }) });
    return json(res, 201, { asset: { id, ...input } });
  }

  if (pathname === "/api/report-content" && req.method === "POST") {
    const input = z.object({ mediaAssetId: z.string().uuid(), reporterEmail: z.string().email(), reason: z.string().min(2), details: z.string().min(5), evidenceUrl: z.string().url().optional() }).parse(await body(req));
    const id = randomUUID();
    await supabaseRest("media_asset_reports", { method: "POST", body: JSON.stringify({ id, media_asset_id: input.mediaAssetId, reporter_email: input.reporterEmail, reason: input.reason, details: input.details, evidence_url: input.evidenceUrl || null, status: "open" }) });
    return json(res, 201, { reportId: id, status: "open" });
  }

  return error(res, 404, "Endpoint không tồn tại.", "NOT_FOUND");
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (caught) {
    console.error(caught);
    const message = caught instanceof z.ZodError ? "Dữ liệu đầu vào không hợp lệ." : caught instanceof Error ? caught.message : "Lỗi máy chủ.";
    const duplicateReward = message.includes("Reward đã được xử lý");
    if (!res.headersSent) error(res, caught instanceof z.ZodError ? 422 : duplicateReward ? 409 : 500, message, caught instanceof z.ZodError ? "VALIDATION_ERROR" : duplicateReward ? "REWARD_ALREADY_CLAIMED" : "INTERNAL_ERROR");
    else res.end();
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(key);
  for (const [key, value] of sourceCache) if (value.expiresAt <= now) sourceCache.delete(key);
}, 60_000).unref();

server.listen(port, "0.0.0.0", () => console.log(`AniGame Archive API listening on :${port}`));
