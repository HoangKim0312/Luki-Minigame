import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { challenges, worlds } from "../lib/archive-data";
import { isAcceptedAnswer } from "../lib/answer";
import { mediaProviderAdapters } from "../lib/media-providers";
import { sourceAdapters } from "../lib/source-adapters";
import { animeThemesAdapter } from "../lib/animethemes-adapter";
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
type WorldRow = {
  id: string;
  source: "anilist" | "igdb" | "animethemes";
  source_id: string;
  type: "anime" | "game";
  title: string;
  slug: string;
  alternative_titles: string[];
  cover_image_url: string | null;
  banner_image_url: string | null;
  description: string | null;
  genres: string[];
  release_year: number | null;
  status: string;
};

function publicWorld(row: WorldRow, collectibleCount = 0) {
  return {
    id: row.id,
    sourceId: row.source_id,
    slug: row.slug,
    title: row.title,
    alternativeTitles: row.alternative_titles,
    type: row.type,
    year: row.release_year ?? 0,
    genres: row.genres,
    cover: row.cover_image_url,
    banner: row.banner_image_url,
    description: row.description ?? "",
    source: row.source,
    progress: 0,
    fragments: 0,
    collectibleCount,
    restoredCount: 0,
  };
}

type RuntimeMedia = {
  id: string;
  playbackUrl: string;
  mediaType: "audio" | "video";
  previewStartSeconds: number;
  previewDurationSeconds: number;
  visualMode: "visible" | "blurred" | "covered" | "audio_player";
  maxReplays: number;
  fullPlaybackAllowed: boolean;
  title: string;
  artist: string | null;
  animeName: string | null;
  gameName: string | null;
  officialSourceUrl: string;
  attribution: string;
};

type RuntimeChallenge = {
  id: string;
  worldId: string;
  worldType: "anime" | "game";
  mode: string;
  prompt: string;
  answer: string;
  aliases: string[];
  hints: string[];
  options?: string[];
  timeLimitSeconds: number;
  media?: RuntimeMedia;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

async function loadChallenge(challengeId: string): Promise<RuntimeChallenge | null> {
  if (isSupabaseConfigured()) {
    const rows = await supabaseRest<Array<{ id: string; world_id: string; media_asset_id: string | null; game_mode: string; prompt: string; correct_answer: string; visual_mode: RuntimeMedia["visualMode"] | null; max_replays: number; time_limit_seconds: number }>>(
      `challenges?id=eq.${encodeURIComponent(challengeId)}&status=eq.active&select=id,world_id,media_asset_id,game_mode,prompt,correct_answer,visual_mode,max_replays,time_limit_seconds&limit=1`,
    );
    const row = rows[0];
    if (row) {
      const [worldRows, answerRows, hintRows] = await Promise.all([
        supabaseRest<Array<{ type: "anime" | "game" }>>(`media_worlds?id=eq.${encodeURIComponent(row.world_id)}&select=type&limit=1`),
        supabaseRest<Array<{ answer: string }>>(`challenge_answers?challenge_id=eq.${encodeURIComponent(row.id)}&select=answer`),
        supabaseRest<Array<{ content: string }>>(`challenge_hints?challenge_id=eq.${encodeURIComponent(row.id)}&select=content&order=position.asc`),
      ]);
      let media: RuntimeMedia | undefined;
      if (row.media_asset_id) {
        const mediaRows = await supabaseRest<Array<{ id: string; playback_url: string; media_type: "audio" | "video"; preview_start_seconds: number; preview_duration_seconds: number; can_play_full_after_reveal: boolean; title: string; artist: string | null; anime_name: string | null; game_name: string | null; official_source_url: string; attribution_text: string }>>(
          `media_assets?id=eq.${encodeURIComponent(row.media_asset_id)}&status=eq.active&approval_status=eq.approved&select=id,playback_url,media_type,preview_start_seconds,preview_duration_seconds,can_play_full_after_reveal,title,artist,anime_name,game_name,official_source_url,attribution_text&limit=1`,
        );
        const asset = mediaRows[0];
        if (asset?.playback_url) {
          media = {
            id: asset.id,
            playbackUrl: asset.playback_url,
            mediaType: asset.media_type,
            previewStartSeconds: asset.preview_start_seconds,
            previewDurationSeconds: Math.min(30, asset.preview_duration_seconds),
            visualMode: row.visual_mode ?? (asset.media_type === "audio" ? "audio_player" : "visible"),
            maxReplays: row.max_replays,
            fullPlaybackAllowed: asset.can_play_full_after_reveal,
            title: asset.title,
            artist: asset.artist,
            animeName: asset.anime_name,
            gameName: asset.game_name,
            officialSourceUrl: asset.official_source_url,
            attribution: asset.attribution_text,
          };
        }
      }
      return {
        id: row.id,
        worldId: row.world_id,
        worldType: worldRows[0]?.type ?? "anime",
        mode: row.game_mode,
        prompt: row.prompt,
        answer: row.correct_answer,
        aliases: answerRows.map((item) => item.answer).filter((answer) => answer !== row.correct_answer),
        hints: hintRows.map((item) => item.content),
        timeLimitSeconds: row.time_limit_seconds,
        media,
      };
    }
  }
  const local = challenges.find((item) => item.id === challengeId);
  if (!local) return null;
  const world = worlds.find((item) => item.id === local.worldId);
  return {
    id: local.id,
    worldId: local.worldId,
    worldType: world?.type ?? "anime",
    mode: local.mode,
    prompt: local.prompt,
    answer: local.answer,
    aliases: local.aliases,
    hints: local.hints,
    options: local.options,
    timeLimitSeconds: 45,
    media: local.media ? {
      id: local.id,
      playbackUrl: local.media.url,
      mediaType: local.media.type,
      previewStartSeconds: local.media.start,
      previewDurationSeconds: Math.min(30, local.media.duration),
      visualMode: local.media.visualMode,
      maxReplays: local.media.maxReplays,
      fullPlaybackAllowed: local.media.fullPlaybackAllowed,
      title: "",
      artist: null,
      animeName: world?.type === "anime" ? world.title : null,
      gameName: world?.type === "game" ? world.title : null,
      officialSourceUrl: local.media.officialSourceUrl,
      attribution: local.media.attribution,
    } : undefined,
  };
}

async function challengeOptions(challenge: RuntimeChallenge) {
  if (challenge.options?.length) return shuffle(challenge.options);
  const candidates = await supabaseRest<Array<{ title: string }>>(
    `media_worlds?type=eq.${challenge.worldType}&status=eq.published&select=title&limit=120`,
  );
  const wrong = shuffle([...new Set(candidates.map((item) => item.title).filter((title) => title !== challenge.answer))]).slice(0, 3);
  return shuffle([challenge.answer, ...wrong]);
}

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

  if (pathname === "/api/worlds" && req.method === "GET") {
    const rows = await supabaseRest<WorldRow[]>("media_worlds?status=eq.published&select=id,source,source_id,type,title,slug,alternative_titles,cover_image_url,banner_image_url,description,genres,release_year,status&order=title.asc");
    const counts = await supabaseRest<Array<{ world_id: string }>>("collectibles?status=eq.active&select=world_id");
    const countByWorld = new Map<string, number>();
    for (const item of counts) countByWorld.set(item.world_id, (countByWorld.get(item.world_id) ?? 0) + 1);
    return json(res, 200, { worlds: rows.map((row) => publicWorld(row, countByWorld.get(row.id) ?? 0)) });
  }
  if (pathname.startsWith("/api/worlds/") && req.method === "GET") {
    const slug = decodeURIComponent(pathname.slice("/api/worlds/".length));
    const rows = await supabaseRest<WorldRow[]>(`media_worlds?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,source,source_id,type,title,slug,alternative_titles,cover_image_url,banner_image_url,description,genres,release_year,status&limit=1`);
    const row = rows[0];
    if (!row) return error(res, 404, "Archive World không tồn tại.", "WORLD_NOT_FOUND");
    const worldCollectibles = await supabaseRest<Array<{ id: string; world_id: string; name: string; type: string; rarity: string; fragment_requirement: number; remote_image_url: string | null }>>(`collectibles?world_id=eq.${encodeURIComponent(row.id)}&status=eq.active&select=id,world_id,name,type,rarity,fragment_requirement,remote_image_url&order=name.asc`);
    const worldChallenges = await supabaseRest<Array<{ id: string; game_mode: string; prompt: string }>>(`challenges?world_id=eq.${encodeURIComponent(row.id)}&status=eq.active&select=id,game_mode,prompt&order=created_at.asc`);
    return json(res, 200, {
      world: publicWorld(row, worldCollectibles.length),
      collectibles: worldCollectibles.map((item) => ({ id: item.id, worldId: item.world_id, name: item.name, type: item.type, rarity: item.rarity, cost: item.fragment_requirement, unlocked: false, image: item.remote_image_url })),
      challenges: worldChallenges.map((item) => ({ id: item.id, mode: item.game_mode, label: item.game_mode, prompt: item.prompt })),
    });
  }
  if (pathname === "/api/daily" && req.method === "GET") {
    const date = new Date().toISOString().slice(0, 10);
    return json(res, 200, { id: `daily-${date}`, date, timezone: "UTC", challenges: challenges.slice(0, 5).map((item) => ({ id: item.id, mode: item.mode, label: item.label, prompt: item.prompt })) });
  }
  if (pathname === "/api/leaderboard" && req.method === "GET") {
    const entries = await supabaseRest<Array<{ username: string; archive_score: number; streak: number }>>("profiles?select=username,archive_score,streak&order=archive_score.desc&limit=50");
    return json(res, 200, { entries: entries.map((entry, index) => ({ rank: index + 1, name: entry.username, score: entry.archive_score, streak: entry.streak })) });
  }
  if (pathname === "/api/challenges" && req.method === "GET") {
    const mode = url.searchParams.get("mode");
    const modeFilter = mode ? `&game_mode=eq.${encodeURIComponent(mode)}` : "";
    const rows = await supabaseRest<Array<{ id: string; world_id: string; game_mode: string; prompt: string; media_asset_id: string | null }>>(
      `challenges?status=eq.active${modeFilter}&select=id,world_id,game_mode,prompt,media_asset_id&order=created_at.desc&limit=500`,
    );
    return json(res, 200, {
      challenges: rows.map((item) => ({
        id: item.id,
        mode: item.game_mode,
        prompt: item.prompt,
        hasMedia: Boolean(item.media_asset_id),
      })),
    });
  }
  if (pathname === "/api/catalog/suggest" && req.method === "GET") {
    const query = z.string().trim().min(2).max(80).parse(url.searchParams.get("q"));
    const type = z.enum(["anime", "game"]).optional().parse(url.searchParams.get("type") || undefined);
    const safe = query.replace(/[%*,()]/g, "");
    const typeFilter = type ? `&type=eq.${type}` : "";
    const rows = await supabaseRest<Array<{ id: string; title: string; alternative_titles: string[]; type: "anime" | "game"; cover_image_url: string | null }>>(
      `media_worlds?status=eq.published${typeFilter}&title=ilike.*${encodeURIComponent(safe)}*&select=id,title,alternative_titles,type,cover_image_url&order=title.asc&limit=8`,
    );
    return json(res, 200, { suggestions: rows.map((item) => ({ id: item.id, title: item.title, alternativeTitles: item.alternative_titles, type: item.type, cover: item.cover_image_url })) });
  }
  if (pathname === "/api/game-sessions" && req.method === "POST") {
    if (!rateLimit(req, res, "session-start", 30, 60_000)) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const input = z.object({ challengeId: z.string().min(1) }).parse(await body(req));
    const challenge = await loadChallenge(input.challengeId);
    if (!challenge) return error(res, 404, "Challenge không tồn tại.", "CHALLENGE_NOT_FOUND");
    const id = randomUUID();
    if (challenge.media && !challenge.media.playbackUrl) return error(res, 409, "Media hiện không khả dụng.", "MEDIA_UNAVAILABLE");
    const guessSeconds = challenge.media ? 20 : challenge.timeLimitSeconds;
    const expiresAt = new Date(Date.now() + (challenge.media ? 5 * 60_000 : (guessSeconds + 5) * 1000)).toISOString();
    const options = await challengeOptions(challenge);
    await supabaseRest("game_sessions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id, user_id: user.id, challenge_id: challenge.id, status: "active", expires_at: expiresAt }) });
    if (challenge.media) {
      await supabaseRest("media_playback_sessions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ game_session_id: id, media_asset_id: challenge.media.id }) });
    }
    return json(res, 201, {
      sessionId: id,
      challengeId: challenge.id,
      challengeType: challenge.mode,
      prompt: challenge.prompt,
      options,
      media: challenge.media ? {
        playbackUrl: challenge.media.playbackUrl,
        mediaType: challenge.media.mediaType,
        previewStartSeconds: challenge.media.previewStartSeconds,
        previewDurationSeconds: challenge.media.previewDurationSeconds,
        visualMode: challenge.media.visualMode,
        maxReplays: challenge.media.maxReplays,
      } : undefined,
      previewDurationSeconds: challenge.media?.previewDurationSeconds ?? 0,
      guessDurationSeconds: guessSeconds,
      expiresAt,
    });
  }

  const mediaStartMatch = pathname.match(/^\/api\/game-sessions\/([^/]+)\/media-start$/);
  if (mediaStartMatch && req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    const rows = await supabaseRest<Array<{ id: string; challenge_id: string; status: string; expires_at: string }>>(`game_sessions?id=eq.${encodeURIComponent(mediaStartMatch[1])}&user_id=eq.${user.id}&select=id,challenge_id,status,expires_at&limit=1`);
    const session = rows[0];
    if (!session || session.status !== "active") return error(res, 404, "Session không tồn tại hoặc đã kết thúc.", "SESSION_NOT_FOUND");
    const playbackRows = await supabaseRest<Array<{ id: string; media_started_at: string | null }>>(`media_playback_sessions?game_session_id=eq.${encodeURIComponent(session.id)}&select=id,media_started_at&limit=1`);
    const playback = playbackRows[0];
    if (!playback) return error(res, 409, "Session không có media.", "MEDIA_SESSION_NOT_FOUND");
    const challenge = await loadChallenge(session.challenge_id);
    if (!challenge?.media) return error(res, 409, "Media không khả dụng.", "MEDIA_UNAVAILABLE");
    const startedAt = playback.media_started_at ?? new Date().toISOString();
    const expiresAt = new Date(Date.parse(startedAt) + (challenge.media.previewDurationSeconds + 20 + 5) * 1000).toISOString();
    if (!playback.media_started_at) {
      await Promise.all([
        supabaseRest(`media_playback_sessions?id=eq.${playback.id}&media_started_at=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ media_started_at: startedAt }) }),
        supabaseRest(`game_sessions?id=eq.${session.id}&status=eq.active`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ expires_at: expiresAt }) }),
      ]);
    }
    return json(res, 200, { mediaStartedAt: startedAt, previewEndsAt: new Date(Date.parse(startedAt) + challenge.media.previewDurationSeconds * 1000).toISOString(), guessEndsAt: new Date(Date.parse(startedAt) + (challenge.media.previewDurationSeconds + 20) * 1000).toISOString(), expiresAt });
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
    const challenge = await loadChallenge(session.challenge_id);
    if (!challenge || session.hint_count >= challenge.hints.length) return error(res, 409, "Không còn hint.", "NO_MORE_HINTS");
    await supabaseRest(`game_sessions?id=eq.${session.id}&status=eq.active`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ hint_count: session.hint_count + 1 }) });
    return json(res, 200, { hint: { position: session.hint_count + 1, content: challenge.hints[session.hint_count] }, scoreAfterHint: [1000, 750, 500, 300, 100][Math.min(session.hint_count + 1, 4)] });
  }

  const submitMatch = pathname.match(/^\/api\/game-sessions\/([^/]+)\/submit-answer$/);
  if (submitMatch && req.method === "POST") {
    if (!rateLimit(req, res, "submit-answer", 30, 60_000)) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const input = z.object({ answer: z.string().trim().max(160) }).parse(await body(req));
    const rows = await supabaseRest<Array<{ id: string; challenge_id: string; hint_count: number; status: string; expires_at: string }>>(`game_sessions?id=eq.${encodeURIComponent(submitMatch[1])}&user_id=eq.${user.id}&select=id,challenge_id,hint_count,status,expires_at&limit=1`);
    const session = rows[0];
    if (!session) return error(res, 404, "Session không tồn tại.", "SESSION_NOT_FOUND");
    if (session.status !== "active") return error(res, 409, "Challenge đã hoàn thành.", "ALREADY_COMPLETED");
    if (Date.parse(session.expires_at) < Date.now()) return error(res, 409, "Challenge đã hết hạn.", "CHALLENGE_EXPIRED");
    const challenge = await loadChallenge(session.challenge_id);
    if (!challenge) return error(res, 404, "Challenge không tồn tại.", "CHALLENGE_NOT_FOUND");
    const correct = isAcceptedAnswer(input.answer, [challenge.answer, ...challenge.aliases]);
    const score = correct ? [1000, 750, 500, 300, 100][Math.min(session.hint_count, 4)] : 0;
    const fragments = correct ? Math.max(1, 3 - session.hint_count) : 0;
    await supabaseRest("rpc/complete_challenge_session", {
      method: "POST",
      body: JSON.stringify({ p_session_id: session.id, p_user_id: user.id, p_world_id: challenge.worldId, p_score: score, p_fragments: fragments, p_correct: correct }),
    });
    return json(res, 200, {
      correct,
      score,
      reward: { fragments, worldId: challenge.worldId },
      reveal: {
        correctAnswer: challenge.answer,
        title: challenge.media?.title ?? null,
        artist: challenge.media?.artist ?? null,
        animeName: challenge.media?.animeName ?? null,
        gameName: challenge.media?.gameName ?? null,
        fullPlaybackAllowed: challenge.media?.fullPlaybackAllowed ?? false,
        fullPlaybackUrl: challenge.media?.fullPlaybackAllowed ? challenge.media.playbackUrl : null,
        officialSourceUrl: challenge.media?.officialSourceUrl ?? null,
        attribution: challenge.media?.attribution ?? null,
      },
    });
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
    const existing = await supabaseRest<Array<{ id: string }>>(`media_worlds?source=eq.${input.source}&source_id=eq.${encodeURIComponent(input.sourceId)}&select=id&limit=1`);
    const slug = item.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const record = { id: existing[0]?.id ?? randomUUID(), source: item.source, source_id: item.sourceId, type: item.type, title: item.title, slug, alternative_titles: item.alternativeTitles, cover_image_url: item.coverImageUrl, banner_image_url: item.bannerImageUrl, description: item.description, genres: item.genres, release_year: item.releaseYear, attribution: item.attribution, license_note: "Remote metadata imported under source API terms.", metadata: item.metadata, status: input.status };
    await supabaseRest("media_worlds?on_conflict=source,source_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(record) });
    if (input.source === "anilist") {
      const characters = await sourceAdapters.anilist.getCharacters(input.sourceId);
      if (characters.length) {
        const characterRows = characters.map((character) => ({
          id: `anilist-character-${character.sourceId}`,
          world_id: record.id,
          name: character.name,
          slug: character.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          type: "character",
          remote_image_url: character.remoteImageUrl,
          source: "anilist",
          source_id: character.sourceId,
          rarity: "common",
          fragment_requirement: 3,
          status: "active",
        }));
        await supabaseRest("collectibles?on_conflict=world_id,slug", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(characterRows),
        });
      }
    }
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_user_id: admin.id, action: "import", entity_type: "media_world", entity_id: record.id, metadata: { source: item.source, sourceId: item.sourceId } }) });
    return json(res, 201, { world: record });
  }

  if (pathname === "/api/admin/animethemes/search" && req.method === "GET") {
    if (!await requireAdmin(req, res)) return;
    const query = z.string().trim().min(2).max(100).parse(url.searchParams.get("q"));
    const cacheKey = `animethemes:${query.toLowerCase()}`;
    const cached = sourceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return json(res, 200, { results: cached.data, cached: true });
    const results = await animeThemesAdapter.searchThemes(query);
    sourceCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60_000, data: results });
    return json(res, 200, { results, cached: false });
  }

  if (pathname === "/api/admin/animethemes/import" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const input = z.object({
      worldId: z.string().min(1),
      animeSlug: z.string().min(1),
      themeId: z.number().int().positive(),
      previewDurationSeconds: z.number().int().min(5).max(30).default(30),
    }).parse(await body(req));
    const targetWorlds = await supabaseRest<Array<{ id: string; title: string; type: "anime" | "game"; alternative_titles: string[]; release_year: number | null }>>(`media_worlds?id=eq.${encodeURIComponent(input.worldId)}&select=id,title,type,alternative_titles,release_year&limit=1`);
    const targetWorld = targetWorlds[0];
    if (!targetWorld || targetWorld.type !== "anime") return error(res, 422, "AnimeThemes chỉ có thể gắn với Anime World.", "MEDIA_WORLD_MISMATCH");
    const themes = await animeThemesAdapter.getAnimeThemes(input.animeSlug);
    const theme = themes.find((item) => item.themeId === input.themeId);
    if (!theme) return error(res, 404, "Không tìm thấy theme trên AnimeThemes.", "THEME_NOT_FOUND");
    const validMapping = await animeThemesAdapter.findThemesForWorld({ title: targetWorld.title, alternativeTitles: targetWorld.alternative_titles, year: targetWorld.release_year });
    if (!validMapping.some((item) => item.themeId === theme.themeId)) return error(res, 422, "Theme không khớp tên/năm của Archive World.", "THEME_WORLD_MISMATCH");
    if (theme.nsfw || theme.spoiler) return error(res, 422, "Theme NSFW/spoiler cần được review thủ công.", "THEME_REQUIRES_REVIEW");

    const existingAssets = await supabaseRest<Array<{ id: string }>>(`media_assets?provider=eq.animethemes&source_url=eq.${encodeURIComponent(theme.playbackUrl)}&select=id&limit=1`);
    const mediaAssetId = existingAssets[0]?.id ?? randomUUID();
    const mediaCategory = theme.themeType === "OP" ? "anime_opening" : "anime_ending";
    await supabaseRest("media_assets?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: mediaAssetId,
        media_world_id: targetWorld.id,
        media_type: "video",
        source_type: "remote_video",
        provider: "animethemes",
        source_url: theme.playbackUrl,
        playback_url: theme.playbackUrl,
        title: theme.songTitle,
        artist: theme.artists.join(", ") || "Unknown artist",
        anime_name: targetWorld.title,
        media_category: mediaCategory,
        preview_start_seconds: 0,
        preview_duration_seconds: input.previewDurationSeconds,
        can_preview: true,
        can_play_full_after_reveal: true,
        requires_external_full_playback: false,
        requires_visible_player: false,
        max_preview_seconds: 30,
        license_type: "provider-api",
        license_note: "Remote video is streamed directly from AnimeThemes.moe using the media link returned by its public API. No download, ripping, transcoding or audio extraction is performed.",
        copyright_owner: "Respective rights holders",
        attribution_text: theme.attribution,
        official_source_url: theme.officialSourceUrl,
        uploaded_by: admin.id,
        approved_by: admin.id,
        approval_status: "approved",
        status: "active",
        metadata: { animeThemesAnimeId: theme.animeId, animeThemesThemeId: theme.themeId, animeThemesVideoId: theme.videoId, themeType: theme.themeType, sequence: theme.sequence, episodes: theme.episodes, basename: theme.basename },
      }),
    });

    const challengeId = `animethemes-${theme.themeId}`;
    await supabaseRest("challenges?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: challengeId,
        world_id: targetWorld.id,
        media_asset_id: mediaAssetId,
        game_mode: theme.themeType === "OP" ? "anime_opening_guess" : "anime_ending_guess",
        prompt: `Đoán anime từ ${theme.themeType === "OP" ? "opening" : "ending"} này.`,
        answer_type: "anime",
        correct_answer: targetWorld.title,
        visual_mode: "covered",
        max_replays: 1,
        time_limit_seconds: 35,
        status: "active",
      }),
    });
    const answers = [targetWorld.title, ...targetWorld.alternative_titles].map((answer) => ({ challenge_id: challengeId, answer, normalized_answer: answer.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() }));
    await supabaseRest(`challenge_answers?challenge_id=eq.${encodeURIComponent(challengeId)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await supabaseRest("challenge_answers", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(answers) });
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_user_id: admin.id, action: "import_animetheme", entity_type: "challenge", entity_id: challengeId, metadata: { provider: "animethemes", themeId: theme.themeId, videoId: theme.videoId } }) });
    return json(res, 201, { challengeId, mediaAssetId, theme });
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
    const input = z.object({
      worldId: z.string().min(1),
      mediaType: z.enum(["audio", "video"]),
      sourceType: z.enum(["remote_audio", "remote_video", "uploaded_audio", "uploaded_video"]),
      sourceUrl: z.string().url(),
      title: z.string().trim().min(1),
      artist: z.string().trim().min(1),
      mediaCategory: z.enum(["anime_opening", "anime_ending", "anime_insert_song", "anime_scene", "game_opening", "game_soundtrack", "game_boss_theme", "game_trailer", "game_cutscene", "character_theme", "other"]),
      previewStartSeconds: z.number().min(0).default(0),
      previewDurationSeconds: z.number().min(5).max(30),
      canPlayFullAfterReveal: z.boolean().default(false),
      licenseType: z.string().min(2),
      licenseNote: z.string().min(5),
      attributionText: z.string().min(2),
      officialSourceUrl: z.string().url(),
    }).parse(await body(req));
    const targetWorlds = await supabaseRest<Array<{ id: string; title: string; type: "anime" | "game"; status: string }>>(`media_worlds?id=eq.${encodeURIComponent(input.worldId)}&select=id,title,type,status&limit=1`);
    const targetWorld = targetWorlds[0];
    if (!targetWorld) return error(res, 422, "Archive World không tồn tại.", "WORLD_NOT_FOUND");
    if (input.mediaCategory.startsWith("anime_") && targetWorld.type !== "anime") return error(res, 422, "Anime media phải gắn với Anime World.", "MEDIA_WORLD_MISMATCH");
    if (input.mediaCategory.startsWith("game_") && targetWorld.type !== "game") return error(res, 422, "Game media phải gắn với Game World.", "MEDIA_WORLD_MISMATCH");
    const adapter = mediaProviderAdapters[input.sourceType];
    const validation = await adapter.validateSource(input.sourceUrl);
    if (!validation.valid) return error(res, 422, validation.reason || "URL không an toàn.", "UNSAFE_REMOTE_URL");
    const id = randomUUID();
    await supabaseRest("media_assets", { method: "POST", body: JSON.stringify({ id, media_world_id: targetWorld.id, media_type: input.mediaType, source_type: input.sourceType, provider: adapter.providerName, source_url: input.sourceUrl, playback_url: input.sourceUrl, title: input.title, artist: input.artist, anime_name: targetWorld.type === "anime" ? targetWorld.title : null, game_name: targetWorld.type === "game" ? targetWorld.title : null, media_category: input.mediaCategory, preview_start_seconds: input.previewStartSeconds, preview_duration_seconds: input.previewDurationSeconds, can_preview: true, can_play_full_after_reveal: input.canPlayFullAfterReveal, requires_external_full_playback: !input.canPlayFullAfterReveal, max_preview_seconds: 30, license_type: input.licenseType, license_note: input.licenseNote, attribution_text: input.attributionText, official_source_url: input.officialSourceUrl, uploaded_by: admin.id, approval_status: "needs_review", status: "draft" }) });
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
