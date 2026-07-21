"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Locale, useI18n } from "./i18n-provider";

type View = "home" | "play" | "create" | "games" | "room";
type GameId = "wavelength" | "number" | "who";
type RoomPhase = "lobby" | "answering" | "reveal" | "finished";

type Player = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  isBot?: boolean;
};

type RoomRecord = {
  code: string;
  hostId: string;
  gameId: GameId;
  mode: "external" | "text" | "voice";
  language: Locale;
  rounds: number;
  round: number;
  phase: RoomPhase;
  players: Player[];
  answers: Record<string, string>;
  createdAt: number;
};

const roomKey = (code: string) => `luki-room-${code}`;

const questions: Record<Locale, string[]> = {
  vi: [
    "Kể tên một món ăn mà hầu như ai cũng thích.",
    "Điều gì mọi người thường quên trước khi đi du lịch?",
    "Một lý do nghe hợp lý để đến muộn là gì?",
    "Kể tên một nhân vật hoạt hình ai cũng nhận ra.",
    "Thứ đầu tiên bạn mua nếu trúng số là gì?",
  ],
  en: [
    "Name a food that almost everyone likes.",
    "What do people often forget before travelling?",
    "What is a believable reason for being late?",
    "Name a cartoon character almost everyone recognizes.",
    "What is the first thing you would buy after winning the lottery?",
  ],
};

const gameMeta: Array<{
  id: GameId;
  icon: string;
  nameKey: "gameWavelength" | "gameNumber" | "gameWho";
  textKey: "gameWavelengthText" | "gameNumberText" | "gameWhoText";
  players: string;
  time: string;
  tone: string;
  playable: boolean;
}> = [
  { id: "wavelength", icon: "≈", nameKey: "gameWavelength", textKey: "gameWavelengthText", players: "2–8", time: "10–15", tone: "lime", playable: true },
  { id: "number", icon: "37", nameKey: "gameNumber", textKey: "gameNumberText", players: "2", time: "15–20", tone: "violet", playable: false },
  { id: "who", icon: "?", nameKey: "gameWho", textKey: "gameWhoText", players: "3–8", time: "15–25", tone: "coral", playable: false },
];

function ensureGuestId() {
  let id = window.sessionStorage.getItem("luki-guest-id");
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem("luki-guest-id", id);
  }
  return id;
}

function saveRoom(room: RoomRecord) {
  window.localStorage.setItem(roomKey(room.code), JSON.stringify(room));
  window.dispatchEvent(new CustomEvent("luki-room-update", { detail: room }));
}

function readRoom(code: string): RoomRecord | null {
  try {
    const raw = window.localStorage.getItem(roomKey(code));
    return raw ? JSON.parse(raw) as RoomRecord : null;
  } catch {
    return null;
  }
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Luki — trang chủ">
      <span className="brand-mark">L</span>
      <span>LUKI</span>
    </Link>
  );
}

function Header() {
  const { locale, setLocale, t } = useI18n();
  return (
    <header className="site-header">
      <Brand />
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        <Link href="/games">{t("navGames")}</Link>
        <Link href="/#how">{t("navHow")}</Link>
      </nav>
      <div className="header-actions">
        <div className="language-switch" aria-label="Language">
          <button className={locale === "vi" ? "active" : ""} onClick={() => setLocale("vi")} aria-pressed={locale === "vi"}>VI</button>
          <span>/</span>
          <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button>
        </div>
        <Link className="text-link desktop-action" href="/play">{t("navJoin")}</Link>
        <Link className="button button-small" href="/create">{t("createRoom")} <span>↗</span></Link>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <Brand />
      <p>{t("footer")}</p>
      <p>© 2026 Luki</p>
    </footer>
  );
}

function CodeForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4 || clean.length > 6) {
      setError(t("invalidCode"));
      return;
    }
    router.push(`/play?code=${clean}`);
  }

  return (
    <form className={compact ? "code-form compact" : "code-form"} onSubmit={submit}>
      <label htmlFor={compact ? "room-code-compact" : "room-code"}>{t("roomCode")}</label>
      <div className="code-control">
        <input
          id={compact ? "room-code-compact" : "room-code"}
          value={code}
          onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }}
          placeholder={t("roomCodePlaceholder")}
          maxLength={6}
          autoComplete="off"
          aria-describedby={error ? "code-error" : undefined}
        />
        <button type="submit" aria-label={t("joinNow")}>→</button>
      </div>
      {error && <p className="field-error" id="code-error">{error}</p>}
    </form>
  );
}

function HomeView() {
  const { t } = useI18n();
  return (
    <>
      <main>
        <section className="hero section-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> {t("eyebrow")}</p>
            <h1>{t("heroA")}<br /><em>{t("heroB")}</em></h1>
            <p className="hero-text">{t("heroText")}</p>
            <CodeForm compact />
            <Link className="under-link" href="/create">{t("createInstead")} <span>↗</span></Link>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="avatar avatar-a">AN</div>
            <div className="avatar avatar-b">MI</div>
            <div className="avatar avatar-c">KH</div>
            <div className="avatar avatar-d">TU</div>
            <div className="spark spark-a">✦</div>
            <div className="spark spark-b">✦</div>
            <div className="talk-card">
              <div className="tiny-wave"><i /><i /><i /><i /><i /></div>
              <strong>{t("liveRoom")}</strong>
              <span>4 {t("friendsOnline")}</span>
            </div>
          </div>
        </section>

        <section className="how section-shell" id="how">
          <div className="step"><b>01</b><div><h2>{t("stepOne")}</h2><p>{t("stepOneText")}</p></div></div>
          <div className="step"><b>02</b><div><h2>{t("stepTwo")}</h2><p>{t("stepTwoText")}</p></div></div>
          <div className="step"><b>03</b><div><h2>{t("stepThree")}</h2><p>{t("stepThreeText")}</p></div></div>
        </section>

        <section className="games-preview section-shell">
          <div className="section-heading">
            <p>{t("madeFor")}</p>
            <h2>{t("whenTalks")}</h2>
          </div>
          <div className="game-grid">
            {gameMeta.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
          <Link className="center-link" href="/games">{t("seeGames")} <span>→</span></Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

function GameCard({ game }: { game: typeof gameMeta[number] }) {
  const { t } = useI18n();
  return (
    <article className={`game-card ${game.tone}`}>
      <div className="game-topline"><span className="game-icon">{game.icon}</span><span className={game.playable ? "status playable" : "status"}>{t(game.playable ? "playable" : "soon")}</span></div>
      <h3>{t(game.nameKey)}</h3>
      <p>{t(game.textKey)}</p>
      <div className="game-meta"><span>♙ {game.players} {t("players")}</span><span>◷ {game.time} {t("mins")}</span></div>
      {game.playable && <Link className="card-link" href="/create">{t("createRoom")} <span>↗</span></Link>}
    </article>
  );
}

function PlayView() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = window.localStorage.getItem("luki-name") ?? "";
    const requestedCode = new URLSearchParams(window.location.search).get("code")?.toUpperCase() ?? "";
    queueMicrotask(() => {
      setName(savedName);
      setCode(requestedCode);
    });
  }, []);

  function join(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError(t("requiredName")); return; }
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4 || clean.length > 6) { setError(t("invalidCode")); return; }
    window.localStorage.setItem("luki-name", name.trim().slice(0, 24));
    ensureGuestId();
    router.push(`/room/${clean}`);
  }

  return (
    <CenteredPanel eyebrow={t("navJoin")} title={t("joinTitle")} text={t("joinText")}>
      <form className="setup-form" onSubmit={join}>
        <Field label={t("displayName")}><input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={t("namePlaceholder")} maxLength={24} autoFocus /></Field>
        <Field label={t("roomCode")}><input className="room-code-input" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }} placeholder="LUKI42" maxLength={6} /></Field>
        {error && <p className="field-error">{error}</p>}
        <button className="button button-wide" type="submit">{t("enterRoom")} <span>→</span></button>
      </form>
      <p className="form-foot">{t("noCode")} <Link href="/create">{t("createOne")}</Link></p>
    </CenteredPanel>
  );
}

function CreateView() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<RoomRecord["mode"]>("external");
  const [rounds, setRounds] = useState(3);
  const [language, setLanguage] = useState<Locale>(locale);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = window.localStorage.getItem("luki-name") ?? "";
    queueMicrotask(() => setName(savedName));
  }, []);

  function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError(t("requiredName")); return; }
    const id = ensureGuestId();
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const room: RoomRecord = {
      code, hostId: id, gameId: "wavelength", mode, language, rounds, round: 1,
      phase: "lobby", answers: {}, createdAt: Date.now(),
      players: [{ id, name: name.trim().slice(0, 24), ready: false, score: 0 }],
    };
    window.localStorage.setItem("luki-name", name.trim().slice(0, 24));
    saveRoom(room);
    router.push(`/room/${code}`);
  }

  return (
    <CenteredPanel eyebrow={t("createRoom")} title={t("createTitle")} text={t("createText")} wide>
      <form className="setup-form two-column" onSubmit={create}>
        <Field label={t("displayName")} full><input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={t("namePlaceholder")} maxLength={24} /></Field>
        <Field label={t("chooseGame")} full>
          <div className="selected-game"><span>≈</span><div><strong>{t("gameWavelength")}</strong><small>{t("playable")} · 2–8 {t("players")}</small></div><b>✓</b></div>
        </Field>
        <Field label={t("communication")}>
          <select value={mode} onChange={(e) => setMode(e.target.value as RoomRecord["mode"])}>
            <option value="external">{t("externalVoice")}</option>
            <option value="text">{t("textChat")}</option>
            <option value="voice">{t("builtInVoice")}</option>
          </select>
        </Field>
        <Field label={t("rounds")}><select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}><option value="3">3</option><option value="5">5</option></select></Field>
        <Field label={t("questionLanguage")} full>
          <div className="segmented"><button type="button" className={language === "vi" ? "active" : ""} onClick={() => setLanguage("vi")}>{t("vietnamese")}</button><button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>{t("english")}</button></div>
        </Field>
        {error && <p className="field-error full">{error}</p>}
        <button className="button button-wide full" type="submit">{t("openRoom")} <span>→</span></button>
      </form>
    </CenteredPanel>
  );
}

function GamesView() {
  const { t } = useI18n();
  return (
    <main className="catalogue section-shell">
      <div className="catalogue-heading"><p className="eyebrow"><span /> Luki games</p><h1>{t("catalogueTitle")}</h1><p>{t("catalogueText")}</p></div>
      <div className="game-grid catalogue-grid">{gameMeta.map((game) => <GameCard key={game.id} game={game} />)}</div>
      <section className="catalogue-cta"><div><span>✦</span><h2>{t("gameWavelength")}</h2><p>{t("gameWavelengthText")}</p></div><Link className="button" href="/create">{t("createRoom")} <span>↗</span></Link></section>
    </main>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={full ? "field full" : "field"}><span>{label}</span>{children}</label>;
}

function CenteredPanel({ eyebrow, title, text, children, wide = false }: { eyebrow: string; title: string; text: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="form-page section-shell">
      <div className={`form-panel ${wide ? "wide" : ""}`}>
        <div className="form-heading"><span className="mini-mark">✦</span><p>{eyebrow}</p><h1>{title}</h1><div>{text}</div></div>
        {children}
      </div>
      <div className="form-orbit" aria-hidden="true"><i /><i /><i /></div>
    </main>
  );
}

function RoomView({ code }: { code: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [guestId, setGuestId] = useState("");
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);

  const syncRoom = useCallback((next: RoomRecord) => {
    setRoom(next);
    saveRoom(next);
  }, []);

  useEffect(() => {
    const id = ensureGuestId();
    const existing = readRoom(code);
    let joined: RoomRecord | null = null;
    if (existing) {
      const name = window.localStorage.getItem("luki-name")?.trim() || `Guest ${existing.players.length + 1}`;
      joined = existing.players.some((player) => player.id === id)
        ? existing
        : { ...existing, players: [...existing.players, { id, name: name.slice(0, 24), ready: false, score: 0 }] };
      if (joined !== existing) saveRoom(joined);
    }
    queueMicrotask(() => {
      setGuestId(id);
      if (joined) setRoom(joined);
      setLoaded(true);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === roomKey(code) && event.newValue) setRoom(JSON.parse(event.newValue) as RoomRecord);
    };
    const onCustom = (event: Event) => {
      const next = (event as CustomEvent<RoomRecord>).detail;
      if (next.code === code) setRoom(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("luki-room-update", onCustom);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("luki-room-update", onCustom); };
  }, [code]);

  const me = room?.players.find((player) => player.id === guestId);
  const isHost = room?.hostId === guestId;
  const canStart = Boolean(room && room.players.length >= 2 && room.players.every((player) => player.ready));
  const currentQuestion = room ? questions[room.language][(room.round - 1) % questions[room.language].length] : "";

  function updatePlayer(changes: Partial<Player>) {
    if (!room) return;
    syncRoom({ ...room, players: room.players.map((player) => player.id === guestId ? { ...player, ...changes } : player) });
  }

  function addDemo() {
    if (!room || room.players.some((player) => player.isBot)) return;
    const names = room.language === "vi" ? ["Mai", "Khoa", "An"] : ["Mia", "Kai", "Ari"];
    syncRoom({ ...room, players: [...room.players, { id: `bot-${Date.now()}`, name: names[room.players.length % names.length], ready: true, score: 0, isBot: true }] });
  }

  function start() {
    if (!room || !isHost || !canStart) return;
    syncRoom({ ...room, phase: "answering", answers: {}, round: 1, players: room.players.map((player) => ({ ...player, score: 0 })) });
  }

  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!room || !answer.trim() || room.answers[guestId]) return;
    const nextAnswers = { ...room.answers, [guestId]: answer.trim().slice(0, 80) };
    room.players.filter((player) => player.isBot).forEach((bot, index) => {
      nextAnswers[bot.id] = room.round % 2 === 1 && index === 0
        ? answer.trim().slice(0, 80)
        : (room.language === "vi" ? "Một câu trả lời rất khác" : "A completely different answer");
    });
    const complete = room.players.every((player) => Boolean(nextAnswers[player.id]));
    if (!complete) {
      syncRoom({ ...room, answers: nextAnswers });
      setAnswer("");
      return;
    }
    const groups = new Map<string, string[]>();
    Object.entries(nextAnswers).forEach(([id, value]) => {
      const key = normalizeAnswer(value);
      groups.set(key, [...(groups.get(key) ?? []), id]);
    });
    const gains = new Map<string, number>();
    groups.forEach((ids) => ids.forEach((id) => gains.set(id, ids.length > 1 ? (ids.length - 1) * 100 : 0)));
    syncRoom({ ...room, answers: nextAnswers, phase: "reveal", players: room.players.map((player) => ({ ...player, score: player.score + (gains.get(player.id) ?? 0) })) });
    setAnswer("");
  }

  function nextRound() {
    if (!room || !isHost) return;
    if (room.round >= room.rounds) syncRoom({ ...room, phase: "finished" });
    else syncRoom({ ...room, round: room.round + 1, phase: "answering", answers: {} });
  }

  function restart() {
    if (!room || !isHost) return;
    syncRoom({ ...room, round: 1, phase: "lobby", answers: {}, players: room.players.map((player) => ({ ...player, ready: player.isBot ?? false, score: 0 })) });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!loaded) return <main className="room-loading">Luki…</main>;
  if (!room) return <CenteredPanel eyebrow={t("privateRoom")} title={t("roomNotFound")} text={t("roomNotFoundText")}><Link className="button button-wide" href="/create">{t("createRoom")} <span>→</span></Link><p className="form-foot"><Link href="/">{t("backHome")}</Link></p></CenteredPanel>;

  return (
    <main className="room-page section-shell">
      <div className="room-topbar">
        <div><p>{t("privateRoom")}</p><button className="room-code" onClick={copyCode}>{code} <span>{copied ? "✓" : "⧉"}</span></button></div>
        <div className="room-mode"><i /> {room.mode === "external" ? t("modeLabel") : room.mode === "text" ? t("textChat") : t("builtInVoice")}</div>
      </div>
      <div className="room-layout">
        <aside className="players-panel">
          <div className="panel-title"><h2>{t("players")}</h2><span>{room.players.length}/8</span></div>
          <div className="player-list">
            {[...room.players].sort((a, b) => b.score - a.score).map((player, index) => (
              <div className="player-row" key={player.id}>
                <span className={`player-avatar avatar-tone-${index % 4}`}>{player.name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{player.name}</strong><small>{player.id === room.hostId ? t("host") : player.id === guestId ? t("you") : player.isBot ? "Demo" : "Online"}</small></div>
                {room.phase === "lobby" ? <i className={player.ready ? "ready-dot active" : "ready-dot"}>✓</i> : <b className="score">{player.score}</b>}
              </div>
            ))}
          </div>
          {room.phase === "lobby" && isHost && <button className="outline-button" onClick={addDemo} disabled={room.players.some((player) => player.isBot)}>+ {t("addDemo")}</button>}
          <div className="demo-notice"><strong>{t("demoNote")}</strong><p>{t("demoExplanation")}</p></div>
        </aside>

        <section className="game-stage">
          {room.phase === "lobby" && (
            <div className="lobby-stage">
              <span className="stage-icon">≈</span><p className="stage-kicker">{t("waitingRoom")}</p><h1>{t("gameWavelength")}</h1><p>{t("gameWavelengthText")}</p>
              <div className="lobby-actions">
                <button className={me?.ready ? "ready-button active" : "ready-button"} onClick={() => updatePlayer({ ready: !me?.ready })}><span>{me?.ready ? "✓" : "○"}</span>{me?.ready ? t("ready") : t("notReady")}</button>
                {isHost && <button className="button" disabled={!canStart} onClick={start}>{t("startGame")} <span>→</span></button>}
              </div>
              {!canStart && isHost && <small className="hint">{t("needPlayers")}</small>}
            </div>
          )}

          {room.phase === "answering" && (
            <div className="answer-stage">
              <div className="round-label">{t("roundOf", { round: room.round, total: room.rounds })}</div>
              <p className="stage-kicker">{t("question")}</p><h1>{currentQuestion}</h1>
              {room.answers[guestId] ? <div className="answer-sent"><span>✓</span><strong>{t("answered")}</strong><p>{t("waitingAnswers")}</p></div> : (
                <form className="answer-form" onSubmit={submitAnswer}><input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t("answerPlaceholder")} maxLength={80} autoFocus /><button className="button" disabled={!answer.trim()}>{t("submitAnswer")} <span>→</span></button></form>
              )}
              <div className="answer-progress">{room.players.map((player) => <i key={player.id} className={room.answers[player.id] ? "done" : ""} />)}</div>
            </div>
          )}

          {room.phase === "reveal" && <Reveal room={room} isHost={isHost} onNext={nextRound} />}
          {room.phase === "finished" && <Results room={room} isHost={isHost} onRestart={restart} />}
        </section>
      </div>
      <button className="leave-link" onClick={() => router.push("/")}>← {t("leaveRoom")}</button>
    </main>
  );
}

function Reveal({ room, isHost, onNext }: { room: RoomRecord; isHost: boolean; onNext: () => void }) {
  const { t } = useI18n();
  const grouped = useMemo(() => {
    const groups = new Map<string, { answer: string; players: Player[] }>();
    Object.entries(room.answers).forEach(([id, answer]) => {
      const key = normalizeAnswer(answer);
      const current = groups.get(key) ?? { answer, players: [] };
      const player = room.players.find((item) => item.id === id);
      if (player) current.players.push(player);
      groups.set(key, current);
    });
    return [...groups.values()].sort((a, b) => b.players.length - a.players.length);
  }, [room]);
  const hasMatch = grouped.some((group) => group.players.length > 1);
  return (
    <div className="reveal-stage"><div className="round-label">{t("roundOf", { round: room.round, total: room.rounds })}</div><p className="stage-kicker">{t("reveal")}</p><h1>{hasMatch ? t("sameAnswer") : t("differentAnswer")}</h1><div className="answer-groups">{grouped.map((group) => <div className={group.players.length > 1 ? "answer-group match" : "answer-group"} key={normalizeAnswer(group.answer)}><strong>{group.answer}</strong><div>{group.players.map((player) => <span key={player.id}>{player.name.slice(0, 2).toUpperCase()}</span>)}</div><b>{group.players.length > 1 ? `+${(group.players.length - 1) * 100}` : "+0"}</b></div>)}</div>{isHost ? <button className="button" onClick={onNext}>{room.round >= room.rounds ? t("finishGame") : t("nextRound")} <span>→</span></button> : <p className="hint">{t("waitingAnswers")}</p>}</div>
  );
}

function Results({ room, isHost, onRestart }: { room: RoomRecord; isHost: boolean; onRestart: () => void }) {
  const { t } = useI18n();
  const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
  return <div className="results-stage"><span className="trophy">✦</span><p className="stage-kicker">{t("winner")}</p><h1>{winner?.name}</h1><strong>{winner?.score ?? 0} pts</strong><div className="podium">{[...room.players].sort((a, b) => b.score - a.score).map((player, index) => <div key={player.id}><span>{index + 1}</span><p>{player.name}</p><b>{player.score}</b></div>)}</div>{isHost && <button className="button" onClick={onRestart}>{t("playAgain")} <span>↻</span></button>}</div>;
}

export function PartyApp({ view, roomCode }: { view: View; roomCode?: string }) {
  return (
    <div className="app-shell">
      <Header />
      {view === "home" && <HomeView />}
      {view === "play" && <PlayView />}
      {view === "create" && <CreateView />}
      {view === "games" && <GamesView />}
      {view === "room" && roomCode && <RoomView code={roomCode} />}
    </div>
  );
}
