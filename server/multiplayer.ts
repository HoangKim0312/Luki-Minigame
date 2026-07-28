import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import { isAcceptedAnswer } from "../lib/answer";
import {
  getSupabaseProfile,
  getSupabaseUser,
  isSupabaseConfigured,
  supabaseRest,
} from "./supabase";

export type MultiplayerChallenge = {
  id: string;
  mode: string;
  answer: string;
  aliases: string[];
  media?: {
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
};

type Player = {
  id: string;
  name: string;
  socketId: string | null;
  ready: boolean;
  score: number;
  correct: number;
  connected: boolean;
  answer?: string;
  answeredAt?: number;
};

type RoomMode = "opening" | "ending" | "mixed";
type RoomPhase = "lobby" | "guess" | "reveal" | "finished";
type Room = {
  id: string;
  code: string;
  hostId: string;
  mode: RoomMode;
  rounds: number;
  maxPlayers: number;
  phase: RoomPhase;
  currentRound: number;
  players: Map<string, Player>;
  challengeIds: string[];
  currentChallenge?: MultiplayerChallenge;
  roundStartedAt?: number;
  phaseEndsAt?: number;
  skipVoters: Set<string>;
  advancing: boolean;
  timers: NodeJS.Timeout[];
  createdAt: number;
};

type Dependencies = {
  loadChallenge(id: string): Promise<MultiplayerChallenge | null>;
  challengeOptions(challenge: MultiplayerChallenge): Promise<string[]>;
};

const rooms = new Map<string, Room>();
const roomByPlayer = new Map<string, string>();
const createRoomSchema = z.object({
  mode: z.enum(["opening", "ending", "mixed"]).default("mixed"),
  rounds: z.number().int().min(5).max(15).default(10),
  maxPlayers: z.number().int().min(2).max(8).default(8),
});
const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/);

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  do {
    result = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(result));
  return result;
}

function publicRoom(room: Room) {
  const eligibleVoters = [...room.players.values()].filter((player) => player.connected && player.id !== room.hostId).length;
  return {
    code: room.code,
    hostId: room.hostId,
    mode: room.mode,
    rounds: room.rounds,
    maxPlayers: room.maxPlayers,
    phase: room.phase,
    currentRound: room.currentRound,
    phaseEndsAt: room.phaseEndsAt ?? null,
    skipVotes: room.skipVoters.size,
    skipVotesRequired: Math.max(1, Math.ceil(eligibleVoters * 0.5)),
    players: [...room.players.values()].map(({ id, name, ready, score, correct, connected }) => ({
      id, name, ready, score, correct, connected,
    })),
  };
}

function ranking(room: Room) {
  return [...room.players.values()]
    .sort((a, b) => b.score - a.score || b.correct - a.correct)
    .map((player, index) => ({
      rank: index + 1,
      id: player.id,
      name: player.name,
      score: player.score,
      correct: player.correct,
      connected: player.connected,
    }));
}

async function identityFromToken(token: unknown) {
  if (typeof token !== "string" || !token || !isSupabaseConfigured()) return null;
  const user = await getSupabaseUser(token);
  if (!user?.id || !user.email) return null;
  const profile = await getSupabaseProfile(user.id);
  if (!profile) return null;
  return { id: user.id, name: profile.username };
}

async function persist(path: string, body: Record<string, unknown>) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabaseRest(path, {
      method: "POST",
      headers: path.includes("on_conflict=") ? { Prefer: "resolution=merge-duplicates" } : undefined,
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Multiplayer persistence failed:", error);
  }
}

async function selectChallengeIds(mode: RoomMode, count: number) {
  const modes = mode === "mixed"
    ? ["anime_opening_guess", "anime_ending_guess"]
    : [mode === "opening" ? "anime_opening_guess" : "anime_ending_guess"];
  const rows = (await Promise.all(modes.map((gameMode) =>
    supabaseRest<Array<{ id: string }>>(
      `challenges?status=eq.active&game_mode=eq.${gameMode}&media_asset_id=not.is.null&select=id&limit=600`,
    )
  ))).flat();
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [rows[index], rows[target]] = [rows[target], rows[index]];
  }
  return rows.slice(0, count).map((row) => row.id);
}

function clearRoomTimers(room: Room) {
  room.timers.forEach(clearTimeout);
  room.timers = [];
}

export function setupMultiplayer(
  httpServer: HttpServer,
  allowedOrigins: string[],
  dependencies: Dependencies,
) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: false },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const user = await identityFromToken(socket.handshake.auth?.token);
      if (!user) return next(new Error("UNAUTHORIZED"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  function emitRoom(room: Room) {
    io.to(room.code).emit("room:state", publicRoom(room));
  }

  async function syncActiveRound(socketId: string, room: Room) {
    const challenge = room.currentChallenge;
    if (!challenge?.media || room.phase === "lobby" || room.phase === "finished") return;
    const previewDurationSeconds = Math.min(30, challenge.media.previewDurationSeconds);
    if (room.phase === "guess") {
      io.to(socketId).emit("round:preview", {
        round: room.currentRound,
        totalRounds: room.rounds,
        serverStartedAt: room.roundStartedAt,
        previewEndsAt: (room.roundStartedAt ?? Date.now()) + previewDurationSeconds * 1_000,
        media: {
          playbackUrl: challenge.media.playbackUrl,
          mediaType: challenge.media.mediaType,
          previewStartSeconds: challenge.media.previewStartSeconds,
          previewDurationSeconds,
          visualMode: "visible",
          maxReplays: 0,
        },
      });
      io.to(socketId).emit("round:guess", {
        round: room.currentRound,
        options: await dependencies.challengeOptions(challenge),
        guessEndsAt: room.phaseEndsAt,
      });
    } else if (room.phase === "reveal") {
      io.to(socketId).emit("round:result", {
        round: room.currentRound,
        answer: challenge.answer,
        reveal: {
          title: challenge.media.title,
          artist: challenge.media.artist,
          animeName: challenge.media.animeName,
          gameName: challenge.media.gameName,
          fullPlaybackAllowed: challenge.media.fullPlaybackAllowed,
          fullPlaybackUrl: challenge.media.fullPlaybackAllowed ? challenge.media.playbackUrl : null,
          officialSourceUrl: challenge.media.officialSourceUrl,
          attribution: challenge.media.attribution,
        },
        ranking: ranking(room),
        nextRoundAt: null,
      });
    }
  }

  async function finishMatch(room: Room) {
    clearRoomTimers(room);
    room.phase = "finished";
    room.phaseEndsAt = undefined;
    io.to(room.code).emit("match:result", { room: publicRoom(room), ranking: ranking(room) });
    emitRoom(room);
    await persist("multiplayer_rooms?on_conflict=id", {
      id: room.id,
      code: room.code,
      host_id: room.hostId,
      mode: room.mode,
      total_rounds: room.rounds,
      max_players: room.maxPlayers,
      status: "finished",
      finished_at: new Date().toISOString(),
    });
  }

  async function advanceAfterReveal(room: Room) {
    if (room.phase !== "reveal" || room.advancing) return false;
    room.advancing = true;
    try {
      if (room.currentRound >= room.rounds) await finishMatch(room);
      else await startRound(room);
      return true;
    } finally {
      room.advancing = false;
    }
  }

  async function revealRound(room: Room) {
    const challenge = room.currentChallenge;
    if (room.phase !== "guess" || !challenge?.media) return;
    clearRoomTimers(room);
    room.phase = "reveal";
    room.phaseEndsAt = undefined;
    room.skipVoters.clear();
    const media = challenge.media;
    io.to(room.code).emit("round:result", {
      round: room.currentRound,
      answer: challenge.answer,
      reveal: {
        title: media.title,
        artist: media.artist,
        animeName: media.animeName,
        gameName: media.gameName,
        fullPlaybackAllowed: media.fullPlaybackAllowed,
        fullPlaybackUrl: media.fullPlaybackAllowed ? media.playbackUrl : null,
        officialSourceUrl: media.officialSourceUrl,
        attribution: media.attribution,
      },
      ranking: ranking(room),
      nextRoundAt: null,
    });
    emitRoom(room);
    await persist("multiplayer_rounds?on_conflict=room_id,round_number", {
      id: randomUUID(),
      room_id: room.id,
      round_number: room.currentRound,
      challenge_id: challenge.id,
      correct_answer: challenge.answer,
      status: "revealed",
      ended_at: new Date().toISOString(),
    });
  }

  async function startRound(room: Room) {
    clearRoomTimers(room);
    const challengeId = room.challengeIds[room.currentRound];
    const challenge = challengeId ? await dependencies.loadChallenge(challengeId) : null;
    if (!challenge?.media) return finishMatch(room);
    room.currentRound += 1;
    room.currentChallenge = challenge;
    room.phase = "guess";
    room.skipVoters.clear();
    room.players.forEach((player) => {
      player.answer = undefined;
      player.answeredAt = undefined;
    });
    const previewDurationSeconds = Math.min(30, challenge.media.previewDurationSeconds);
    const options = await dependencies.challengeOptions(challenge);
    room.roundStartedAt = Date.now();
    room.phaseEndsAt = room.roundStartedAt + (previewDurationSeconds + 20) * 1_000;
    io.to(room.code).emit("round:preview", {
      round: room.currentRound,
      totalRounds: room.rounds,
      serverStartedAt: room.roundStartedAt,
      previewEndsAt: room.roundStartedAt + previewDurationSeconds * 1_000,
      media: {
        playbackUrl: challenge.media.playbackUrl,
        mediaType: challenge.media.mediaType,
        previewStartSeconds: challenge.media.previewStartSeconds,
        previewDurationSeconds,
        visualMode: "visible",
        maxReplays: 0,
      },
    });
    io.to(room.code).emit("round:guess", {
      round: room.currentRound,
      options,
      guessEndsAt: room.phaseEndsAt,
    });
    emitRoom(room);
    room.timers.push(setTimeout(() => void revealRound(room), (previewDurationSeconds + 20) * 1_000));
  }

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; name: string };

    socket.on("room:create", async (raw, reply) => {
      try {
        const input = createRoomSchema.parse(raw);
        const existing = roomByPlayer.get(user.id);
        if (existing) {
          const oldRoom = rooms.get(existing);
          if (oldRoom && oldRoom.phase !== "finished") return reply?.({ ok: false, error: "Bạn đang ở trong một phòng khác." });
        }
        const code = roomCode();
        const room: Room = {
          id: randomUUID(),
          code,
          hostId: user.id,
          mode: input.mode,
          rounds: input.rounds,
          maxPlayers: input.maxPlayers,
          phase: "lobby",
          currentRound: 0,
          players: new Map(),
          challengeIds: [],
          skipVoters: new Set(),
          advancing: false,
          timers: [],
          createdAt: Date.now(),
        };
        room.players.set(user.id, { ...user, socketId: socket.id, ready: true, score: 0, correct: 0, connected: true });
        rooms.set(code, room);
        roomByPlayer.set(user.id, code);
        await socket.join(code);
        await persist("multiplayer_rooms", {
          id: room.id, code, host_id: user.id, mode: input.mode,
          total_rounds: input.rounds, max_players: input.maxPlayers, status: "lobby",
        });
        await persist("multiplayer_room_players", {
          id: randomUUID(), room_id: room.id, user_id: user.id, display_name: user.name,
          ready: true, score: 0, connected: true,
        });
        reply?.({ ok: true, code });
        emitRoom(room);
      } catch {
        reply?.({ ok: false, error: "Cấu hình phòng không hợp lệ." });
      }
    });

    socket.on("room:join", async (raw, reply) => {
      try {
        const code = codeSchema.parse(typeof raw === "string" ? raw : raw?.code);
        const room = rooms.get(code);
        if (!room) return reply?.({ ok: false, error: "Không tìm thấy phòng hoặc phòng đã hết hạn." });
        if (room.phase !== "lobby" && !room.players.has(user.id)) {
          return reply?.({ ok: false, error: "Trận đấu đã bắt đầu." });
        }
        if (!room.players.has(user.id) && room.players.size >= room.maxPlayers) return reply?.({ ok: false, error: "Phòng đã đầy." });
        const current = room.players.get(user.id);
        room.players.set(user.id, {
          ...user,
          socketId: socket.id,
          ready: current?.ready ?? false,
          score: current?.score ?? 0,
          correct: current?.correct ?? 0,
          connected: true,
        });
        roomByPlayer.set(user.id, code);
        await socket.join(code);
        await persist("multiplayer_room_players?on_conflict=room_id,user_id", {
          id: randomUUID(), room_id: room.id, user_id: user.id, display_name: user.name,
          ready: current?.ready ?? false, score: current?.score ?? 0, connected: true,
        });
        reply?.({ ok: true, code });
        emitRoom(room);
        await syncActiveRound(socket.id, room);
      } catch {
        reply?.({ ok: false, error: "Mã phòng phải gồm 6 ký tự." });
      }
    });

    socket.on("room:ready", (ready) => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      const player = room?.players.get(user.id);
      if (!room || !player || room.phase !== "lobby") return;
      player.ready = Boolean(ready);
      if (user.id === room.hostId) player.ready = true;
      emitRoom(room);
    });

    socket.on("room:start", async (_raw, reply) => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      if (!room || room.hostId !== user.id) return reply?.({ ok: false, error: "Chỉ chủ phòng có thể bắt đầu." });
      if (room.phase !== "lobby") return reply?.({ ok: false, error: "Phòng đã bắt đầu." });
      if (room.players.size < 2) return reply?.({ ok: false, error: "Cần ít nhất 2 người chơi." });
      if ([...room.players.values()].some((player) => !player.ready || !player.connected)) {
        return reply?.({ ok: false, error: "Tất cả người chơi phải online và sẵn sàng." });
      }
      room.challengeIds = await selectChallengeIds(room.mode, room.rounds);
      if (room.challengeIds.length < room.rounds) return reply?.({ ok: false, error: "Không đủ challenge phù hợp." });
      await persist("multiplayer_rooms?on_conflict=id", {
        id: room.id, code: room.code, host_id: room.hostId, mode: room.mode,
        total_rounds: room.rounds, max_players: room.maxPlayers, status: "playing",
        started_at: new Date().toISOString(),
      });
      reply?.({ ok: true });
      await startRound(room);
    });

    socket.on("round:answer", async (raw, reply) => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      const player = room?.players.get(user.id);
      if (!room || !player || room.phase !== "guess" || !room.currentChallenge) {
        return reply?.({ ok: false, error: "Vòng đoán không còn hoạt động." });
      }
      if (player.answeredAt) return reply?.({ ok: false, error: "Bạn đã chốt đáp án." });
      const parsed = z.object({ answer: z.string().trim().min(1).max(160) }).safeParse(raw);
      if (!parsed.success) return reply?.({ ok: false, error: "Đáp án không hợp lệ." });
      const answeredAt = Date.now();
      const correct = isAcceptedAnswer(parsed.data.answer, [room.currentChallenge.answer, ...room.currentChallenge.aliases]);
      const elapsedSeconds = Math.max(0, (answeredAt - (room.roundStartedAt ?? answeredAt)) / 1_000);
      const points = correct ? Math.max(100, Math.round(1_000 - elapsedSeconds * 18)) : 0;
      player.answer = parsed.data.answer;
      player.answeredAt = answeredAt;
      player.score += points;
      if (correct) player.correct += 1;
      await persist("multiplayer_answers", {
        id: randomUUID(), room_id: room.id, round_number: room.currentRound,
        user_id: user.id, submitted_answer: parsed.data.answer, is_correct: correct,
        score_awarded: points, answered_at: new Date(answeredAt).toISOString(),
      });
      reply?.({ ok: true, locked: true });
      socket.emit("round:answer-locked", { answer: parsed.data.answer });
      if ([...room.players.values()].filter((entry) => entry.connected).every((entry) => entry.answeredAt)) {
        await revealRound(room);
      }
    });

    socket.on("round:next", async (_raw, reply) => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      if (!room || room.phase !== "reveal") return reply?.({ ok: false, error: "Chưa thể qua câu tiếp theo." });
      if (room.hostId !== user.id) return reply?.({ ok: false, error: "Chỉ chủ phòng có thể bấm Next." });
      if (room.advancing) return reply?.({ ok: false, error: "Đang tải câu tiếp theo." });
      reply?.({ ok: true });
      await advanceAfterReveal(room);
    });

    socket.on("round:skip-vote", async (_raw, reply) => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      const player = room?.players.get(user.id);
      if (!room || !player || room.phase !== "reveal") return reply?.({ ok: false, error: "Chỉ vote sau khi reveal." });
      if (room.hostId === user.id) return reply?.({ ok: false, error: "Host có thể bấm Next trực tiếp." });
      if (room.skipVoters.has(user.id)) room.skipVoters.delete(user.id);
      else room.skipVoters.add(user.id);
      const eligibleVoters = [...room.players.values()].filter((entry) => entry.connected && entry.id !== room.hostId).length;
      const required = Math.max(1, Math.ceil(eligibleVoters * 0.5));
      emitRoom(room);
      reply?.({ ok: true, voted: room.skipVoters.has(user.id), votes: room.skipVoters.size, required });
      if (room.skipVoters.size >= required) {
        await advanceAfterReveal(room);
      }
    });

    socket.on("room:leave", () => {
      const code = roomByPlayer.get(user.id);
      const room = rooms.get(code || "");
      if (!room) return;
      if (room.phase === "lobby") {
        room.players.delete(user.id);
        roomByPlayer.delete(user.id);
        void socket.leave(room.code);
        if (room.hostId === user.id) {
          const nextHost = room.players.values().next().value as Player | undefined;
          if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.ready = true;
          } else {
            clearRoomTimers(room);
            rooms.delete(room.code);
          }
        }
        emitRoom(room);
      }
    });

    socket.on("disconnect", () => {
      const room = rooms.get(roomByPlayer.get(user.id) || "");
      const player = room?.players.get(user.id);
      if (!room || !player) return;
      if (player.socketId === socket.id) {
        player.connected = false;
        player.socketId = null;
        emitRoom(room);
      }
    });
  });

  setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1_000;
    for (const [code, room] of rooms) {
      if ((room.phase === "finished" || room.phase === "lobby") && room.createdAt < cutoff) {
        clearRoomTimers(room);
        rooms.delete(code);
        room.players.forEach((player) => roomByPlayer.delete(player.id));
      }
    }
  }, 10 * 60 * 1_000).unref();

  return io;
}
