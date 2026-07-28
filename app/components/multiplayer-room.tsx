"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getBackendUrl } from "@/lib/backend-url";
import { useAuth } from "../auth-provider";
import { GuessMediaPlayer } from "./guess-media-player";

type RoomMode = "opening" | "ending" | "mixed";
type RoomPlayer = { id: string; name: string; ready: boolean; score: number; correct: number; connected: boolean; answered: boolean };
type RoomState = {
  code: string;
  hostId: string;
  mode: RoomMode;
  rounds: number;
  maxPlayers: number;
  phase: "lobby" | "guess" | "answer_locked" | "reveal" | "finished";
  currentRound: number;
  phaseEndsAt: number | null;
  skipVotes: number;
  skipVotesRequired: number;
  players: RoomPlayer[];
};
type Preview = {
  round: number;
  totalRounds: number;
  previewEndsAt: number;
  media: {
    playbackUrl: string;
    mediaType: "audio" | "video";
    previewStartSeconds: number;
    previewDurationSeconds: number;
    visualMode: "visible";
    maxReplays: number;
  };
};
type Ranking = { rank: number; id: string; name: string; score: number; correct: number; connected: boolean };
type Reveal = {
  answer: string;
  reveal: {
    title: string;
    artist: string | null;
    animeName: string | null;
    gameName: string | null;
    fullPlaybackAllowed: boolean;
    fullPlaybackUrl: string | null;
    officialSourceUrl: string;
    attribution: string;
  };
  ranking: Ranking[];
  nextRoundAt: number | null;
};
type Reply = { ok: boolean; code?: string; error?: string };

const modeLabels: Record<RoomMode, string> = {
  opening: "Chỉ Opening",
  ending: "Chỉ Ending",
  mixed: "Opening + Ending",
};

function remainingSeconds(endsAt: number | null | undefined, now: number) {
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1_000)) : 0;
}

export function MultiplayerRoom() {
  const { session, status } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [mode, setMode] = useState<RoomMode>("mixed");
  const [rounds, setRounds] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [joinCode, setJoinCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false);
  const [votedSkip, setVotedSkip] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [finalRanking, setFinalRanking] = useState<Ranking[] | null>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    const socket = io(getBackendUrl(), {
      auth: { token: session.token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      const queryCode = new URLSearchParams(window.location.search).get("code");
      if (queryCode) {
        socket.emit("room:join", { code: queryCode }, (reply: Reply) => {
          if (!reply.ok) setNotice(reply.error || "Không thể vào phòng.");
        });
      }
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => setNotice(error.message === "UNAUTHORIZED" ? "Phiên đăng nhập đã hết hạn." : "Không thể kết nối máy chủ phòng."));
    socket.on("room:state", (value: RoomState) => setRoom(value));
    socket.on("round:preview", (value: Preview) => {
      setPreview(value);
      setOptions([]);
      setSelected("");
      setAnswerLocked(false);
      setVotedSkip(false);
      setReveal(null);
      setNotice("Bốn đáp án đã mở. Đoán càng sớm, điểm càng cao.");
    });
    socket.on("round:guess", (value: { options: string[] }) => {
      setOptions(value.options);
      setReveal(null);
      setNotice("Chọn ngay khi nhận ra anime — clip dừng ở giây 30, còn thêm 20 giây để chốt.");
    });
    socket.on("round:answer-locked", () => {
      setAnswerLocked(true);
      setNotice("Đã khóa đáp án. Đang chờ người chơi còn lại.");
    });
    socket.on("round:all-answered", () => {
      setAnswerLocked(true);
      setNotice("Tất cả đã chốt đáp án — reveal sau 3 giây.");
    });
    socket.on("round:result", (value: Reveal) => {
      setReveal(value);
      setOptions([]);
      setNotice("");
    });
    socket.on("match:result", (value: { ranking: Ranking[] }) => {
      setFinalRanking(value.ranking);
      setNotice("");
    });
    socket.on("room:error", (value: { message: string }) => setNotice(value.message));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.token]);

  const me = room?.players.find((player) => player.id === session?.user.id);
  const sortedPlayers = useMemo(
    () => [...(room?.players ?? [])].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    [room?.players],
  );

  const updateUrl = (code: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.history.replaceState({}, "", url);
  };

  const createRoom = () => {
    setNotice("");
    socketRef.current?.emit("room:create", { mode, rounds, maxPlayers }, (reply: Reply) => {
      if (!reply.ok || !reply.code) return setNotice(reply.error || "Không thể tạo phòng.");
      updateUrl(reply.code);
    });
  };

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    socketRef.current?.emit("room:join", { code }, (reply: Reply) => {
      if (!reply.ok || !reply.code) return setNotice(reply.error || "Không thể vào phòng.");
      updateUrl(reply.code);
    });
  };

  const startRoom = () => {
    socketRef.current?.emit("room:start", {}, (reply: Reply) => {
      if (!reply.ok) setNotice(reply.error || "Không thể bắt đầu.");
    });
  };

  const submitAnswer = (answer: string) => {
    if (answerLocked || !answer) return;
    setSelected(answer);
    socketRef.current?.emit("round:answer", { answer }, (reply: Reply) => {
      if (!reply.ok) setNotice(reply.error || "Không thể gửi đáp án.");
      else setAnswerLocked(true);
    });
  };

  const advanceRound = () => {
    socketRef.current?.emit("round:next", {}, (reply: Reply) => {
      if (!reply.ok) setNotice(reply.error || "Không thể qua câu tiếp theo.");
    });
  };

  const voteSkip = () => {
    socketRef.current?.emit("round:skip-vote", {}, (reply: Reply & { voted?: boolean }) => {
      if (!reply.ok) setNotice(reply.error || "Không thể vote.");
      else setVotedSkip(Boolean(reply.voted));
    });
  };

  if (status === "loading") return <section className="room-page"><div className="room-loading">Đang xác minh tài khoản…</div></section>;
  if (!session) {
    return (
      <section className="room-page">
        <div className="room-gate">
          <p className="kicker">MULTIPLAYER ARCHIVE</p>
          <h1>Đăng nhập để vào phòng</h1>
          <p>Mỗi người chơi cần một tài khoản để server xác minh đáp án, điểm và kết quả trận.</p>
          <Link className="button primary" href="/login">Đăng nhập</Link>
        </div>
      </section>
    );
  }

  if (!room) {
    return (
      <section className="room-page">
        <header className="room-hero">
          <div>
            <p className="kicker">REALTIME MUSIC QUIZ</p>
            <h1>Archive<br /><em>Rooms</em></h1>
            <p>Tạo phòng riêng, mời bạn bè bằng mã 6 ký tự và cùng đoán anime từ Opening hoặc Ending thật trong catalog AnimeThemes.</p>
          </div>
          <div className="room-signal"><i className={connected ? "online" : ""} /><span>{connected ? "RAILWAY REALTIME ONLINE" : "ĐANG KẾT NỐI…"}</span></div>
        </header>
        <div className="room-entry-grid">
          <article className="room-panel">
            <span className="room-panel-number">01</span>
            <p className="kicker">HOST A MATCH</p>
            <h2>Tạo phòng mới</h2>
            <label>Loại bài hát<select value={mode} onChange={(event) => setMode(event.target.value as RoomMode)}>
              <option value="opening">Chỉ Opening</option>
              <option value="ending">Chỉ Ending</option>
              <option value="mixed">Opening + Ending</option>
            </select></label>
            <div className="room-form-row">
              <label>Số vòng<select value={rounds} onChange={(event) => setRounds(Number(event.target.value))}>
                {[5, 10, 15].map((value) => <option value={value} key={value}>{value}</option>)}
              </select></label>
              <label>Số người<select value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>
                {[2, 4, 6, 8].map((value) => <option value={value} key={value}>{value}</option>)}
              </select></label>
            </div>
            <button className="button primary" type="button" disabled={!connected} onClick={createRoom}>Tạo phòng</button>
          </article>
          <article className="room-panel join">
            <span className="room-panel-number">02</span>
            <p className="kicker">JOIN A MATCH</p>
            <h2>Nhập mã phòng</h2>
            <form onSubmit={joinRoom}>
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" maxLength={6} aria-label="Mã phòng" />
              <button className="button secondary" type="submit" disabled={!connected || joinCode.length !== 6}>Vào phòng</button>
            </form>
            <p className="room-help">Mã phòng do host chia sẻ. Trận cần ít nhất 2 người và tất cả phải Ready.</p>
          </article>
        </div>
        {notice && <p className="room-notice">{notice}</p>}
      </section>
    );
  }

  const timer = remainingSeconds(room.phaseEndsAt, now);
  const ranking = finalRanking ?? reveal?.ranking;
  return (
    <section className="room-game">
      <header className="room-game-header">
        <div><span>ROOM CODE</span><strong>{room.code}</strong><button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?code=${room.code}`)}>COPY LINK</button></div>
        <p>{modeLabels[room.mode]} <i>•</i> {room.rounds} vòng</p>
        <div className="room-live"><i className={connected ? "online" : ""} /> {connected ? "LIVE" : "RECONNECTING"}</div>
      </header>

      {room.phase === "lobby" ? (
        <div className="room-lobby">
          <div>
            <p className="kicker">WAITING ROOM</p>
            <h1>Sẵn sàng phục hồi<br />kho nhạc?</h1>
            <p>Host bắt đầu khi có ít nhất 2 người và mọi thành viên đã Ready.</p>
            <div className="lobby-rules">
              <span><b>30s</b> xem/nghe video</span>
              <span><b>20s</b> chọn đáp án</span>
              <span><b>4</b> lựa chọn anime</span>
            </div>
            {room.hostId === session.user.id ? (
              <button className="button primary" type="button" onClick={startRoom}>Bắt đầu trận</button>
            ) : (
              <button className={`button ${me?.ready ? "secondary" : "primary"}`} type="button" onClick={() => socketRef.current?.emit("room:ready", !me?.ready)}>
                {me?.ready ? "Hủy sẵn sàng" : "Tôi đã sẵn sàng"}
              </button>
            )}
          </div>
          <PlayerList players={sortedPlayers} hostId={room.hostId} maxPlayers={room.maxPlayers} />
        </div>
      ) : (
        <div className="multiplayer-layout">
          <main>
            <div className="round-heading">
              <div><span>ROUND</span><strong>{String(room.currentRound).padStart(2, "0")}<i>/{String(room.rounds).padStart(2, "0")}</i></strong></div>
              <p>{room.phase === "guess" ? "NGHE VÀ CHỌN ANIME" : room.phase === "answer_locked" ? "ĐANG KHÓA ĐÁP ÁN" : room.phase === "reveal" ? "KẾT QUẢ" : "HOÀN THÀNH"}</p>
              {room.phase !== "finished" && <div className="round-timer">{timer}<small>SEC</small></div>}
            </div>
            {preview && (
              <GuessMediaPlayer
                key={`${preview.round}-${reveal ? "reveal" : "guess"}`}
                {...preview.media}
                playbackUrl={reveal?.reveal.fullPlaybackUrl || preview.media.playbackUrl}
                revealed={Boolean(reveal)}
                fullPlaybackAllowed={Boolean(reveal?.reveal.fullPlaybackAllowed)}
                autoPlay
              />
            )}
            {(room.phase === "guess" || room.phase === "answer_locked") && (
              <>
                {room.phase === "answer_locked" && (
                  <div className="answer-countdown">
                    <span>SYNC COMPLETE</span>
                    <strong>{timer}</strong>
                    <p>Chuẩn bị reveal kết quả</p>
                  </div>
                )}
                <div className="multiplayer-options">
                  {options.map((option, index) => (
                    <button className={selected === option ? "selected" : ""} disabled={answerLocked || room.phase === "answer_locked"} type="button" key={option} onClick={() => submitAnswer(option)}>
                      <span>{String.fromCharCode(65 + index)}</span>
                      <b>{option}</b>
                      <i>{selected === option ? "ĐÃ CHỐT" : "CHỌN"}</i>
                    </button>
                  ))}
                </div>
              </>
            )}
            {reveal && room.phase === "reveal" && (
              <div className="multiplayer-reveal">
                <p className="kicker">ARCHIVE RESTORED</p>
                <h2>{reveal.reveal.animeName || reveal.answer}</h2>
                <p><b>{reveal.reveal.title}</b>{reveal.reveal.artist ? ` — ${reveal.reveal.artist}` : ""}</p>
                <small>{reveal.reveal.attribution}</small>
                <a href={reveal.reveal.officialSourceUrl} target="_blank" rel="noreferrer">Mở nguồn chính thức ↗</a>
                <div className="reveal-actions">
                  {room.hostId === session.user.id ? (
                    <button className="button primary" type="button" onClick={advanceRound}>
                      {room.currentRound >= room.rounds ? "Xem kết quả trận" : "Câu tiếp theo"}
                    </button>
                  ) : (
                    <button className={`button ${votedSkip ? "secondary" : "primary"}`} type="button" onClick={voteSkip}>
                      {votedSkip ? "Hủy vote" : "Vote qua câu"} · {room.skipVotes}/{room.skipVotesRequired}
                    </button>
                  )}
                </div>
              </div>
            )}
            {room.phase === "finished" && ranking && <FinalBoard ranking={ranking} />}
            {notice && <p className="room-notice inline">{notice}</p>}
          </main>
          <aside className="live-scoreboard">
            <p className="kicker">LIVE SCOREBOARD</p>
            <h2>Người chơi</h2>
            {sortedPlayers.map((player, index) => (
              <div className={player.id === session.user.id ? "is-me" : ""} key={player.id}>
                <span>#{index + 1}</span><i>{player.name.slice(0, 2).toUpperCase()}</i>
                <p><b>{player.name}</b><small>{room.phase === "guess" || room.phase === "answer_locked" ? player.answered ? "Đã trả lời" : "Đang nghe…" : `${player.correct} câu đúng`}</small></p>
                <strong>{player.score}</strong>
              </div>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}

function PlayerList({ players, hostId, maxPlayers }: { players: RoomPlayer[]; hostId: string; maxPlayers: number }) {
  return (
    <aside className="lobby-players">
      <header><span>PLAYERS</span><strong>{players.length}/{maxPlayers}</strong></header>
      {players.map((player) => (
        <div key={player.id}>
          <i>{player.name.slice(0, 2).toUpperCase()}</i>
          <p><b>{player.name}</b><small>{player.id === hostId ? "HOST" : player.connected ? "ONLINE" : "MẤT KẾT NỐI"}</small></p>
          <span className={player.ready ? "ready" : ""}>{player.ready ? "READY" : "WAITING"}</span>
        </div>
      ))}
      {Array.from({ length: Math.max(0, maxPlayers - players.length) }, (_, index) => <div className="empty-player" key={index}>Đang chờ người chơi…</div>)}
    </aside>
  );
}

function FinalBoard({ ranking }: { ranking: Ranking[] }) {
  return (
    <div className="final-board">
      <p className="kicker">MATCH COMPLETE</p>
      <h1>{ranking[0]?.name || "Archive Restored"} chiến thắng</h1>
      {ranking.map((player) => <div key={player.id}><span>#{player.rank}</span><b>{player.name}</b><small>{player.correct} đúng</small><strong>{player.score} pts</strong></div>)}
      <Link className="button primary" href="/room">Tạo trận mới</Link>
    </div>
  );
}
