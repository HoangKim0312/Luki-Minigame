"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { challenges, collectibles, leaderboard, modes, worlds } from "@/lib/archive-data";
import { isAcceptedAnswer } from "@/lib/answer";
import { GuessMediaPlayer } from "./guess-media-player";
import { RemoteMediaImage } from "./remote-media-image";
import { authApi, useAuth } from "../auth-provider";

type View = "home" | "explore" | "play" | "challenge" | "daily" | "collection" | "leaderboard" | "profile" | "admin" | "world" | "copyright" | "report";

const modeNames: Record<string, string> = {
  hint_ladder: "Hint Ladder",
  cropped_memory: "Cropped Memory",
  character_trail: "Character Trail",
  asset_link: "Asset Link",
  wrong_information: "Wrong Information",
  anime_opening_guess: "Anime Opening Guess",
  game_soundtrack_guess: "Game Soundtrack Guess",
  anime_video_guess: "Anime Video Guess",
};

function SectionHeading({ kicker, title, aside }: { kicker: string; title: string; aside?: React.ReactNode }) {
  return <div className="section-heading"><div><p>{kicker}</p><h2>{title}</h2></div>{aside}</div>;
}

function WorldCard({ world, large = false }: { world: (typeof worlds)[number]; large?: boolean }) {
  return (
    <Link className={`world-card ${large ? "large" : ""}`} href={`/world/${world.slug}`}>
      <RemoteMediaImage src={world.cover} alt={world.title} />
      <span className="world-shade" />
      <div className="world-card-copy">
        <p><span>{world.type}</span> {world.year}</p>
        <h3>{world.title}</h3>
        <div className="world-progress"><i><b style={{ width: `${world.progress}%` }} /></i><span>{world.progress}%</span></div>
      </div>
    </Link>
  );
}

function HomeView() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker"><span /> Archive protocol · 07</p>
          <h1>Guess.<br /><em>Restore.</em><br />Collect.</h1>
          <p>Khôi phục ký ức đã mất của những thế giới anime và game. Mỗi đáp án đúng là một mảnh dữ liệu trở về đúng chỗ.</p>
          <div className="hero-actions">
            <Link className="button primary" href="/play">Bắt đầu phục hồi <span>→</span></Link>
            <Link className="button ghost" href="/explore">Khám phá Archive</Link>
          </div>
          <div className="hero-stats"><span><b>06</b> Archive Worlds</span><span><b>118</b> Collectibles</span><span><b>08</b> Game modes</span></div>
        </div>
        <div className="hero-visual">
          <div className="archive-ring ring-one" /><div className="archive-ring ring-two" />
          <div className="memory-card main-memory">
            <RemoteMediaImage src={worlds[1].cover} alt={worlds[1].title} />
            <div><small>ARCHIVE · GAME.017</small><strong>Android Requiem</strong><span>42% restored</span></div>
          </div>
          <div className="memory-card mini-memory one"><span>✦</span><b>+3</b><small>FRAGMENTS</small></div>
          <div className="memory-card mini-memory two"><span>◆</span><b>RARE</b><small>NEW SIGNAL</small></div>
        </div>
      </section>

      <section className="ticker" aria-label="Trạng thái hệ thống">
        <span>LIVE ARCHIVE</span><p>Daily challenge đang mở</p><i /> <p>3,481 restorers online</p><i /> <p>Remote sources healthy</p>
      </section>

      <section className="page-section">
        <SectionHeading kicker="Featured worlds" title="Những ký ức đang chờ" aside={<Link className="text-link" href="/explore">Xem toàn bộ →</Link>} />
        <div className="world-grid">{worlds.slice(0, 4).map((world, index) => <WorldCard key={world.id} world={world} large={index === 0} />)}</div>
      </section>

      <section className="page-section daily-feature">
        <div className="daily-copy">
          <p className="kicker"><span /> Daily signal</p><h2>Nhiễu sóng<br />từ <em>Midnight</em></h2>
          <p>Hoàn thành chuỗi 5 thử thách chung trong hôm nay. Điểm, hint và thời gian đều được xác minh phía máy chủ.</p>
          <div className="daily-meta"><span><b>05</b> challenges</span><span><b>12:41</b> còn lại</span><span><b>+500</b> bonus</span></div>
          <Link className="button primary" href="/daily">Nhận tín hiệu <span>→</span></Link>
        </div>
        <div className="daily-stack">
          {challenges.slice(0, 3).map((challenge, index) => (
            <div className="signal-card" key={challenge.id} style={{ transform: `translate(${index * 18}px, ${index * -8}px)` }}>
              <small>0{index + 1} · {challenge.label}</small><strong>{challenge.prompt}</strong><span>{index === 0 ? "READY" : "LOCKED"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionHeading kicker="Restore loop" title="Bốn nhịp. Một kho lưu trữ." />
        <div className="loop-grid">{[
          ["01", "Đoán", "Chọn game mode và giải mã hint, hình ảnh hoặc media."],
          ["02", "Nhận mảnh", "Điểm và fragment được máy chủ tính sau khi xác minh."],
          ["03", "Phục hồi", "Dùng fragment mở character, item, weapon và moment."],
          ["04", "Hoàn tất", "Lấp đầy album để nhận badge, title và cosmetic."],
        ].map(([number, title, text]) => <div key={number}><b>{number}</b><span>✦</span><h3>{title}</h3><p>{text}</p></div>)}</div>
      </section>
    </>
  );
}

function ExploreView() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = worlds.filter((world) => (filter === "all" || world.type === filter) && world.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="page-section top-section">
      <div className="page-intro"><p className="kicker"><span /> Archive directory</p><h1>Khám phá<br /><em>Archive Worlds</em></h1><p>Mỗi thế giới là một album ký ức có thử thách, collectible và phần thưởng riêng.</p></div>
      <div className="filter-bar">
        <div>{["all", "anime", "game"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "Tất cả" : item}</button>)}</div>
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Archive World..." /></label>
      </div>
      {filtered.length ? <div className="explore-grid">{filtered.map((world) => <WorldCard key={world.id} world={world} />)}</div> : <div className="empty-state"><span>⌁</span><h2>Không tìm thấy tín hiệu</h2><p>Thử một từ khóa hoặc bộ lọc khác.</p></div>}
    </section>
  );
}

function PlayView() {
  return (
    <section className="page-section top-section">
      <div className="page-intro split"><div><p className="kicker"><span /> Challenge terminal</p><h1>Chọn cách<br /><em>giải mã ký ức</em></h1></div><p>Tất cả game mode dùng chung engine session. Answer, timer, hint và reward được xác minh phía backend.</p></div>
      <div className="mode-grid">{modes.map((mode, index) => {
        const challenge = challenges.find((item) => item.mode === mode.id) ?? challenges[0];
        return <Link href={`/play/${challenge.id}`} className="mode-card" key={mode.id}>
          <div className="mode-number">{mode.icon}</div><span className="mode-symbol">{["⌁", "◩", "⌖", "◇", "≠", "◖", "▣"][index]}</span>
          <h2>{mode.label}</h2><p>{mode.description}</p><footer><small>{mode.reward}</small><b>Chơi ngay →</b></footer>
        </Link>;
      })}</div>
    </section>
  );
}

function ChallengeView({ challengeId }: { challengeId?: string }) {
  const { status } = useAuth();
  const challenge = challenges.find((item) => item.id === challengeId) ?? challenges[0];
  const world = worlds.find((item) => item.id === challenge.worldId) ?? worlds[0];
  const [answer, setAnswer] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [result, setResult] = useState<null | { correct: boolean; score: number; fragments: number }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");
  const score = [1000, 750, 500, 300, 100][Math.min(hintCount, 4)];

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const created = await authApi<{ sessionId: string }>("/api/game-sessions", {
      method: "POST",
      body: JSON.stringify({ challengeId: challenge.id }),
    });
    setSessionId(created.sessionId);
    return created.sessionId;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!answer || result) return;
    setSubmitting(true);
    setSessionError("");
    if (status === "authenticated") {
      try {
        const currentSessionId = await ensureSession();
        const payload = await authApi<{ correct: boolean; score: number; reward: { fragments: number } }>(`/api/game-sessions/${currentSessionId}/submit-answer`, {
          method: "POST",
          body: JSON.stringify({ answer }),
        });
        setResult({ correct: payload.correct, score: payload.score, fragments: payload.reward.fragments });
      } catch (caught) {
        setSessionError(caught instanceof Error ? caught.message : "Không thể xác minh đáp án.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    const correct = isAcceptedAnswer(answer, [challenge.answer, ...challenge.aliases]);
    const next = { correct, score: correct ? score : 0, fragments: correct ? Math.max(1, 3 - hintCount) : 0 };
    setResult(next);
    setSubmitting(false);
  };

  const openHint = async () => {
    if (hintCount >= challenge.hints.length || result) return;
    setSessionError("");
    if (status === "authenticated") {
      try {
        const currentSessionId = await ensureSession();
        await authApi(`/api/game-sessions/${currentSessionId}/open-hint`, { method: "POST" });
      } catch (caught) {
        setSessionError(caught instanceof Error ? caught.message : "Không thể mở hint.");
        return;
      }
    }
    setHintCount((value) => value + 1);
  };

  return (
    <section className="challenge-page">
      <div className="challenge-topbar">
        <Link href="/play">← Thoát</Link><div><span>{modeNames[challenge.mode]}</span><i><b style={{ width: "34%" }} /></i><small>01 / 05</small></div><strong>{score}<small> PTS</small></strong>
      </div>
      <div className="challenge-layout">
        <aside className="challenge-info"><p className="kicker"><span /> Live challenge</p><h1>{challenge.label}</h1><p>{challenge.prompt}</p><div className="world-chip"><RemoteMediaImage src={world.cover} alt={world.title} /><span><small>Archive world</small><b>{world.title}</b></span></div><div className="reward-box"><span>REWARD</span><b>◆ {Math.max(1, 3 - hintCount)} fragments</b></div></aside>
        <div className="challenge-console">
          {challenge.media ? (
            <GuessMediaPlayer mediaType={challenge.media.type} playbackUrl={challenge.media.url} previewStartSeconds={challenge.media.start} previewDurationSeconds={challenge.media.duration} visualMode={challenge.media.visualMode} maxReplays={challenge.media.maxReplays} revealed={Boolean(result)} fullPlaybackAllowed={challenge.media.fullPlaybackAllowed} />
          ) : challenge.image ? (
            <RemoteMediaImage src={challenge.image} alt={result ? challenge.answer : "Ký ức bị nhiễu"} challengeStage={result ? 3 : hintCount} className="challenge-image" />
          ) : (
            <div className="hint-display">
              <small>DATA FRAGMENTS · {hintCount || 1}</small>
              {(hintCount ? challenge.hints.slice(0, hintCount) : [challenge.hints[0]]).map((hint, index) => <div key={hint}><span>0{index + 1}</span><p>{hint}</p></div>)}
            </div>
          )}
          {challenge.options ? (
            <div className="option-grid">{challenge.options.map((option, index) => <button className={answer === option ? "selected" : ""} type="button" onClick={() => setAnswer(option)} key={option}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
          ) : (
            <form className="answer-box" onSubmit={submit}><label htmlFor="answer">Nhập đáp án</label><div><input id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Tên anime, game hoặc character..." autoComplete="off" disabled={Boolean(result)} /><button disabled={!answer || submitting || Boolean(result)}>Xác nhận →</button></div></form>
          )}
          {challenge.options && <button className="button primary submit-option" type="button" onClick={(event) => void submit(event as unknown as FormEvent)} disabled={!answer || submitting || Boolean(result)}>Xác nhận đáp án</button>}
          {!result && <button className="hint-button" onClick={() => void openHint()} disabled={hintCount >= challenge.hints.length}>⌁ Mở hint tiếp theo <span>−250 điểm</span></button>}
          {sessionError && <div className="admin-notice">{sessionError} {status !== "authenticated" && <Link href="/login">Đăng nhập</Link>}</div>}
          {result && <div className={`result-panel ${result.correct ? "correct" : "wrong"}`}><span>{result.correct ? "✓" : "×"}</span><div><small>{result.correct ? "MEMORY RESTORED" : "SIGNAL LOST"}</small><h2>{result.correct ? "Chính xác!" : "Chưa đúng"}</h2><p>Đáp án: <b>{challenge.answer}</b></p>{challenge.media && <p className="attribution">{challenge.media.attribution}</p>}</div><aside><strong>+{result.score}</strong><small>điểm</small><b>◆ +{result.fragments} fragments</b></aside></div>}
          {result && <div className="result-actions"><Link className="button ghost" href="/collection">Xem collection</Link><Link className="button primary" href="/play">Challenge tiếp →</Link></div>}
        </div>
      </div>
    </section>
  );
}

function DailyView() {
  return (
    <section className="page-section top-section">
      <div className="daily-hero"><div><p className="kicker"><span /> Daily protocol · UTC</p><h1>Chuỗi phục hồi<br /><em>28.07.2026</em></h1><p>Một lượt nhận reward mỗi ngày. Kết quả được ghi từ backend sau khi toàn bộ session hợp lệ.</p></div><div className="streak-orb"><small>STREAK</small><strong>12</strong><span>NGÀY</span></div></div>
      <div className="daily-route">{challenges.slice(0, 5).map((challenge, index) => <div className={index === 0 ? "active" : ""} key={challenge.id}><span>0{index + 1}</span><div><small>{challenge.label}</small><b>{challenge.prompt}</b></div><em>{index === 0 ? "PLAY" : "LOCKED"}</em>{index === 0 && <Link href={`/play/${challenge.id}`}>Bắt đầu →</Link>}</div>)}</div>
      <div className="daily-bottom"><div><small>DAILY REWARD</small><strong>◆ 10 fragments + badge</strong></div><div><small>THỜI GIAN CÒN LẠI</small><strong>12 giờ 41 phút</strong></div><div><small>TOP SCORE HÔM NAY</small><strong>4,280 pts</strong></div></div>
    </section>
  );
}

function CollectionView() {
  const { status } = useAuth();
  const [selected, setSelected] = useState(collectibles[0]);
  const [restored, setRestored] = useState<string[]>(collectibles.filter((item) => item.unlocked).map((item) => item.id));
  const [restoreError, setRestoreError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const isRestored = restored.includes(selected.id);
  const restore = async () => {
    setRestoreError("");
    if (status !== "authenticated") {
      setRestoreError("Đăng nhập để lưu collectible vào Supabase.");
      return;
    }
    setRestoring(true);
    try {
      await authApi(`/api/collectibles/${selected.id}/restore`, { method: "POST" });
      setRestored((items) => [...items, selected.id]);
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : "Không thể restore collectible.");
    } finally {
      setRestoring(false);
    }
  };
  return (
    <section className="page-section top-section">
      <div className="page-intro split"><div><p className="kicker"><span /> Personal vault</p><h1>Collection<br /><em>của bạn</em></h1></div><div className="collection-summary"><span><b>{restored.length}</b> / {collectibles.length} restored</span><i><b style={{ width: `${restored.length / collectibles.length * 100}%` }} /></i><small>◆ 12 fragments khả dụng</small></div></div>
      <div className="collection-layout">
        <div className="collectible-grid">{collectibles.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={`${selected.id === item.id ? "selected" : ""} ${restored.includes(item.id) ? "" : "locked"}`}><RemoteMediaImage src={item.image} alt={item.name} /><span className={`rarity ${item.rarity}`}>{item.rarity}</span><div><small>{item.type}</small><b>{restored.includes(item.id) ? item.name : "Unknown memory"}</b></div></button>)}</div>
        <aside className="collectible-detail"><RemoteMediaImage src={selected.image} alt={selected.name} /><span className={`rarity ${selected.rarity}`}>{selected.rarity}</span><small>{selected.type}</small><h2>{isRestored ? selected.name : "Dữ liệu bị khóa"}</h2><p>{isRestored ? "Một ký ức đã được phục hồi và lưu an toàn trong Archive cá nhân." : "Dùng fragment cùng Archive World để khôi phục collectible này."}</p><div className="detail-cost"><span>Cần để restore</span><b>◆ {selected.cost} fragments</b></div>{restoreError && <p className="admin-notice">{restoreError}</p>}<button className="button primary" disabled={isRestored || selected.cost > 12 || restoring} onClick={() => void restore()}>{isRestored ? "Đã phục hồi" : restoring ? "Đang restore..." : "Restore collectible"}</button></aside>
      </div>
    </section>
  );
}

function LeaderboardView() {
  const [period, setPeriod] = useState("Daily");
  return (
    <section className="page-section top-section">
      <div className="page-intro"><p className="kicker"><span /> Global signal</p><h1>Top<br /><em>Restorers</em></h1><p>Điểm chỉ xuất hiện sau khi challenge session được xác minh phía máy chủ.</p></div>
      <div className="period-tabs">{["Daily", "Weekly", "Monthly", "All time"].map((item) => <button className={period === item ? "active" : ""} onClick={() => setPeriod(item)} key={item}>{item}</button>)}</div>
      <div className="podium">{leaderboard.slice(0, 3).map((player) => <div className={`rank-${player.rank}`} key={player.name}><span>0{player.rank}</span><div className="avatar-code">{player.name.slice(0, 2).toUpperCase()}</div><h3>{player.name}</h3><small>{player.title}</small><strong>{player.score.toLocaleString()} <i>PTS</i></strong></div>)}</div>
      <div className="leader-list">{leaderboard.map((player) => <div key={player.name}><b>#{String(player.rank).padStart(2, "0")}</b><span className="avatar-code small">{player.name.slice(0, 2).toUpperCase()}</span><p><strong>{player.name}</strong><small>{player.title}</small></p><span>🔥 {player.streak} ngày</span><em>{player.score.toLocaleString()} pts</em></div>)}</div>
    </section>
  );
}

function ProfileView() {
  return (
    <section className="profile-page">
      <div className="profile-banner"><div className="profile-sigil">HK</div><div><p className="kicker"><span /> Verified restorer</p><h1>hoangkim.archive</h1><span className="profile-title">PERFECT ARCHIVIST</span></div><button className="button ghost">Chỉnh profile</button></div>
      <div className="page-section profile-content">
        <div className="profile-stats">{[["18", "Level"], ["4,280", "Archive score"], ["56", "Collectibles"], ["12", "Daily streak"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <div className="profile-columns"><div><SectionHeading kicker="Showcase" title="Ký ức yêu thích" /><div className="showcase-grid">{collectibles.slice(0, 3).map((item) => <div key={item.id}><RemoteMediaImage src={item.image} alt={item.name} /><span className={`rarity ${item.rarity}`}>{item.rarity}</span><b>{item.name}</b></div>)}</div></div><aside><SectionHeading kicker="Recent signal" title="Hoạt động" />{["Phục hồi YoRHa Unit 2B", "Hoàn tất Daily Challenge", "Đạt streak 12 ngày", "Mở badge Signal Hunter"].map((item, index) => <p key={item}><span>✦</span><b>{item}</b><small>{index + 1} giờ trước</small></p>)}</aside></div>
      </div>
    </section>
  );
}

function WorldView({ slug }: { slug?: string }) {
  const world = worlds.find((item) => item.slug === slug) ?? worlds[0];
  const items = collectibles.filter((item) => item.worldId === world.id);
  return (
    <>
      <section className="world-hero"><RemoteMediaImage src={world.banner} alt={world.title} /><span className="world-hero-shade" /><div><p className="kicker"><span /> {world.source} · {world.type}</p><h1>{world.title}</h1><p>{world.description}</p><div className="tag-row">{world.genres.map((genre) => <span key={genre}>{genre}</span>)}<span>{world.year}</span></div></div></section>
      <section className="page-section world-content"><div className="world-overview"><div><small>ALBUM PROGRESS</small><strong>{world.progress}%</strong><i><b style={{ width: `${world.progress}%` }} /></i></div><div><small>RESTORED</small><strong>{world.restoredCount} / {world.collectibleCount}</strong></div><div><small>FRAGMENTS</small><strong>◆ {world.fragments}</strong></div><Link className="button primary" href="/play">Chơi challenge →</Link></div>
      <SectionHeading kicker="World collection" title="Dữ liệu có thể phục hồi" />
      {items.length ? <div className="showcase-grid">{items.map((item) => <div key={item.id}><RemoteMediaImage src={item.image} alt={item.name} /><span className={`rarity ${item.rarity}`}>{item.rarity}</span><b>{item.name}</b></div>)}</div> : <div className="empty-state"><span>⌁</span><h2>Archive chưa đồng bộ collectible</h2><p>Admin có thể thêm dữ liệu tại Media Manager.</p></div>}</section>
    </>
  );
}

function AdminView() {
  const [tab, setTab] = useState("Import");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("AniList");
  const [notice, setNotice] = useState("");
  const [adminResults, setAdminResults] = useState<Array<{ source: "anilist" | "igdb"; sourceId: string; title: string; coverImageUrl: string | null; releaseYear: number | null; genres: string[] }>>([]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice("Đang tìm dữ liệu từ nguồn...");
    try {
      const sourceKey = source.toLowerCase() as "anilist" | "igdb";
      const payload = await authApi<{ results: typeof adminResults }>(`/api/media/search?source=${sourceKey}&q=${encodeURIComponent(search)}`);
      setAdminResults(payload.results);
      setNotice(payload.results.length ? `Tìm thấy ${payload.results.length} kết quả.` : "Không tìm thấy kết quả.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Không thể tìm dữ liệu.");
    }
  };
  const importWorld = async (item: (typeof adminResults)[number]) => {
    setNotice(`Đang import ${item.title}...`);
    try {
      await authApi("/api/admin/worlds/import", { method: "POST", body: JSON.stringify({ source: item.source, sourceId: item.sourceId, status: "draft" }) });
      setNotice(`${item.title} đã được import vào Supabase ở trạng thái draft.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Import thất bại.");
    }
  };
  return (
    <section className="admin-page">
      <aside><p className="brand"><span className="brand-mark">A</span><span>ARCHIVE<br /><b>CONTROL</b></span></p><nav>{["Overview", "Import", "Worlds", "Collectibles", "Challenges", "Daily", "Media assets", "Reports", "Audit log"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav><Link href="/">← Về website</Link></aside>
      <div className="admin-content">
        <header><div><small>ADMIN DASHBOARD</small><h1>{tab}</h1></div><span>HK · Administrator</span></header>
        {tab === "Import" ? <div className="admin-grid">
          <section className="admin-panel wide"><div className="panel-head"><div><small>MEDIA SOURCE ADAPTER</small><h2>Tìm và import World</h2></div><span className="status-pill">ONLINE</span></div>
            <form className="import-form" onSubmit={submit}><select value={source} onChange={(event) => setSource(event.target.value)}><option>AniList</option><option>IGDB</option></select><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên anime hoặc game..." required /><button>Tìm kiếm</button></form>
            {notice && <div className="admin-notice">{notice} Backend sẽ cache kết quả và không sao chép binary asset.</div>}
            <div className="import-results">{(adminResults.length ? adminResults : worlds.slice(0, 3).map((world) => ({ source: world.source, sourceId: world.id, title: world.title, coverImageUrl: world.cover, releaseYear: world.year, genres: world.genres }))).map((world) => <div key={`${world.source}-${world.sourceId}`}><RemoteMediaImage src={world.coverImageUrl} alt={world.title} /><p><small>{world.source} · {world.releaseYear}</small><b>{world.title}</b><span>{world.genres.join(" · ")}</span></p><button onClick={() => void importWorld(world)}>Import</button></div>)}</div>
          </section>
          <section className="admin-panel"><div className="panel-head"><div><small>SOURCE HEALTH</small><h2>Adapter status</h2></div></div>{[["AniList", "GraphQL · cached 20m"], ["IGDB", "Backend token · cached 20m"], ["R2 Media", "Signed playback URL"]].map(([name, meta]) => <p className="adapter-row" key={name}><i /><span><b>{name}</b><small>{meta}</small></span><em>Healthy</em></p>)}</section>
        </div> : tab === "Media assets" ? <MediaManager /> : <AdminOverview />}
      </div>
    </section>
  );
}

function AdminOverview() {
  return <><div className="admin-stats">{[["06", "Published worlds", "+2 tháng này"], ["118", "Collectibles", "92 active"], ["1,284", "Game sessions", "98.4% valid"], ["04", "Open reports", "1 needs review"]].map(([value, label, meta]) => <div key={label}><small>{label}</small><strong>{value}</strong><span>{meta}</span></div>)}</div><div className="admin-grid"><section className="admin-panel wide"><div className="panel-head"><div><small>ACTIVITY</small><h2>Archive operations</h2></div></div>{["Daily set 28.07 đã publish", "Media asset #7F72 được approve", "Android Requiem đã import từ IGDB", "Report #R104 chuyển sang review"].map((item, index) => <p className="activity-row" key={item}><span>0{index + 1}</span><b>{item}</b><small>{index + 2}h trước</small></p>)}</section><section className="admin-panel"><div className="panel-head"><div><small>SAFETY</small><h2>Content health</h2></div></div><div className="health-score"><strong>96</strong><span>/100</span></div><p className="health-note">Tất cả active media đều có attribution. 4 asset đang chờ rà soát license.</p></section></div></>;
}

function MediaManager() {
  const [duration, setDuration] = useState(30);
  const [notice, setNotice] = useState("");
  const saveMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mediaType = String(form.get("mediaType")) as "audio" | "video";
    try {
      await authApi("/api/admin/media-assets", {
        method: "POST",
        body: JSON.stringify({
          mediaType,
          sourceType: mediaType === "audio" ? "remote_audio" : "remote_video",
          sourceUrl: form.get("sourceUrl"),
          title: form.get("title"),
          mediaCategory: form.get("mediaCategory"),
          previewStartSeconds: Number(form.get("previewStartSeconds")),
          previewDurationSeconds: duration,
          canPlayFullAfterReveal: form.get("fullPlayback") === "on",
          licenseType: form.get("licenseType"),
          licenseNote: form.get("licenseNote"),
          attributionText: form.get("attributionText"),
          officialSourceUrl: form.get("officialSourceUrl"),
        }),
      });
      setNotice("Media asset đã được lưu vào Supabase ở trạng thái needs_review.");
      event.currentTarget.reset();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Không thể lưu media.");
    }
  };
  return <div className="admin-grid"><section className="admin-panel wide"><div className="panel-head"><div><small>LICENSED MEDIA</small><h2>Thêm remote audio / video</h2></div><span className="status-pill warning">DRAFT</span></div><form className="media-form" onSubmit={saveMedia}><label>Remote HTTPS URL<input name="sourceUrl" required type="url" placeholder="https://cdn.partner.example/media/..." /></label><label>Tiêu đề nội bộ<input name="title" required /></label><div><label>Media type<select name="mediaType"><option value="audio">Audio</option><option value="video">Video</option></select></label><label>Category<select name="mediaCategory"><option value="anime_opening">Anime opening</option><option value="game_soundtrack">Game soundtrack</option><option value="anime_scene">Anime scene</option><option value="other">Other</option></select></label></div><div><label>Preview start (giây)<input name="previewStartSeconds" type="number" min="0" defaultValue="12" /></label><label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[5, 10, 15, 20, 30].map((value) => <option key={value} value={value}>{value} giây</option>)}</select></label></div><div className="timeline"><span style={{ left: "18%", width: `${duration * 2}%` }} /><small>Preview duration · {duration} giây</small></div><label>Attribution<textarea name="attributionText" required placeholder="Nguồn, tác giả, chủ sở hữu..." /></label><label>License type<input name="licenseType" required placeholder="licensed / royalty-free / public-domain" /></label><label>License note<textarea name="licenseNote" required placeholder="Mô tả quyền preview và full playback..." /></label><label>Official source URL<input name="officialSourceUrl" required type="url" /></label><label><input name="fullPlayback" type="checkbox" /> Cho phép full playback sau reveal</label>{notice && <p className="admin-notice">{notice}</p>}<div className="form-actions"><button className="button primary" type="submit">Lưu bản nháp</button></div></form></section><section className="admin-panel"><div className="panel-head"><div><small>CAPABILITY</small><h2>Playback rules</h2></div></div>{["Preview tối đa 30 giây", "Không autoplay có âm thanh", "Không tách audio khỏi video", "Full player chỉ sau reveal", "Official source fallback"].map((item) => <p className="check-row" key={item}>✓ <span>{item}</span></p>)}</section></div>;
}

function LegalView({ report = false }: { report?: boolean }) {
  const [sent, setSent] = useState(false);
  const [reportError, setReportError] = useState("");
  const sendReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportError("");
    const form = new FormData(event.currentTarget);
    try {
      await authApi("/api/report-content", {
        method: "POST",
        body: JSON.stringify({
          mediaAssetId: form.get("mediaAssetId"),
          reporterEmail: form.get("reporterEmail"),
          reason: form.get("reason"),
          details: form.get("details"),
        }),
      });
      setSent(true);
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : "Không thể gửi báo cáo.");
    }
  };
  if (report) return <section className="page-section top-section legal-page"><div className="page-intro"><p className="kicker"><span /> Content safety</p><h1>Báo cáo<br /><em>nội dung</em></h1><p>Asset bị disable sẽ lập tức ngừng xuất hiện trong challenge mới nhưng không xóa lịch sử hợp lệ.</p></div>{sent ? <div className="success-state"><span>✓</span><h2>Đã nhận báo cáo</h2><p>Admin sẽ kiểm tra attribution, license và nguồn phát.</p></div> : <form className="report-form" onSubmit={sendReport}><label>Media asset ID<input name="mediaAssetId" required placeholder="UUID của media asset" /></label><label>Email liên hệ<input name="reporterEmail" required type="email" /></label><label>Lý do<select name="reason"><option>Vấn đề bản quyền</option><option>Nguồn không còn hoạt động</option><option>Attribution không đúng</option><option>Nội dung không phù hợp</option></select></label><label>Chi tiết<textarea name="details" required rows={6} /></label>{reportError && <p className="admin-notice">{reportError}</p>}<button className="button primary">Gửi báo cáo →</button></form>}</section>;
  return <section className="page-section top-section legal-page"><div className="page-intro"><p className="kicker"><span /> Rights & attribution</p><h1>Copyright<br /><em>policy</em></h1></div><div className="legal-copy"><h2>Nguyên tắc nguồn media</h2><p>AniGame Archive không rip, tách audio, chuyển đổi hay tải media từ YouTube, Spotify hoặc nền tảng streaming. Audio và video luôn được phát ở định dạng gốc từ remote URL, object storage hoặc official embed có quyền phù hợp.</p><h2>Preview và full playback</h2><p>Mỗi asset khai báo capability riêng. Nếu nguồn không cho phép phát đầy đủ trên website, sau reveal người chơi được dẫn về nguồn chính thức. Website không bypass quảng cáo, branding, token hoặc access control.</p><h2>Yêu cầu gỡ nội dung</h2><p>Chủ sở hữu có thể gửi báo cáo kèm bằng chứng. Admin có thể disable ngay, xóa source URL và lưu audit log mà không sửa lịch sử điểm đã xác minh.</p><Link className="button primary" href="/report-content">Báo cáo nội dung →</Link></div></section>;
}

export function ArchiveApp({ view, slug, challengeId }: { view: View; slug?: string; challengeId?: string }) {
  const content = useMemo(() => {
    if (view === "home") return <HomeView />;
    if (view === "explore") return <ExploreView />;
    if (view === "play") return <PlayView />;
    if (view === "challenge") return <ChallengeView challengeId={challengeId} />;
    if (view === "daily") return <DailyView />;
    if (view === "collection") return <CollectionView />;
    if (view === "leaderboard") return <LeaderboardView />;
    if (view === "profile") return <ProfileView />;
    if (view === "world") return <WorldView slug={slug} />;
    if (view === "admin") return <AdminView />;
    if (view === "copyright") return <LegalView />;
    return <LegalView report />;
  }, [challengeId, slug, view]);
  return content;
}
