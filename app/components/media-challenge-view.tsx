"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { authApi, useAuth } from "../auth-provider";
import { GuessMediaPlayer } from "./guess-media-player";
import { RemoteMediaImage } from "./remote-media-image";

type ChallengeListItem = {
  id: string;
  mode: "anime_opening_guess" | "anime_ending_guess";
  prompt: string;
};

type SessionPayload = {
  sessionId: string;
  challengeId: string;
  challengeType: string;
  prompt: string;
  options: string[];
  media: {
    playbackUrl: string;
    mediaType: "audio" | "video";
    previewStartSeconds: number;
    previewDurationSeconds: number;
    visualMode: "visible" | "blurred" | "covered" | "audio_player";
    maxReplays: number;
  };
  previewDurationSeconds: number;
  guessDurationSeconds: number;
  expiresAt: string;
};

type RevealPayload = {
  correct: boolean;
  score: number;
  reward: { fragments: number };
  reveal: {
    correctAnswer: string;
    title: string | null;
    artist: string | null;
    animeName: string | null;
    gameName: string | null;
    fullPlaybackAllowed: boolean;
    fullPlaybackUrl: string | null;
    officialSourceUrl: string | null;
    attribution: string | null;
  };
};

type Suggestion = {
  id: string;
  title: string;
  alternativeTitles: string[];
  type: "anime" | "game";
  cover: string | null;
};

type Phase = "loading" | "ready" | "preview" | "guess" | "revealed";
type AnswerMode = "multiple_choice" | "autocomplete";

export function MediaChallengeView() {
  const { status } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [challenge, setChallenge] = useState<ChallengeListItem | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("multiple_choice");
  const [answer, setAnswer] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [guessRemaining, setGuessRemaining] = useState(20);
  const [result, setResult] = useState<RevealPayload | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRandomChallenge = useCallback(async () => {
    try {
      const [opening, ending] = await Promise.all([
        authApi<{ challenges: ChallengeListItem[] }>("/api/challenges?mode=anime_opening_guess"),
        authApi<{ challenges: ChallengeListItem[] }>("/api/challenges?mode=anime_ending_guess"),
      ]);
      const pool = [...opening.challenges, ...ending.challenges];
      if (!pool.length) throw new Error("Chưa có opening/ending challenge khả dụng.");
      const requested = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;
      setChallenge(pool.find((item) => item.id === requested) ?? pool[Math.floor(Math.random() * pool.length)]);
      setPhase("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải challenge.");
      setPhase("ready");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRandomChallenge(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRandomChallenge]);

  const start = async () => {
    if (!challenge || status !== "authenticated") return;
    setError("");
    try {
      const payload = await authApi<SessionPayload>("/api/game-sessions", {
        method: "POST",
        body: JSON.stringify({ challengeId: challenge.id }),
      });
      setSession(payload);
      setGuessRemaining(payload.guessDurationSeconds);
      setAnswer("");
      setSuggestions([]);
      setResult(null);
      setPhase("preview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể bắt đầu challenge.");
    }
  };

  const submitAnswer = useCallback(async (submittedAnswer: string) => {
    if (!session || result || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = await authApi<RevealPayload>(`/api/game-sessions/${session.sessionId}/submit-answer`, {
        method: "POST",
        body: JSON.stringify({ answer: submittedAnswer }),
      });
      setResult(payload);
      setPhase("revealed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể xác minh đáp án.");
    } finally {
      setSubmitting(false);
    }
  }, [result, session, submitting]);

  useEffect(() => {
    if (phase !== "guess" || result) return;
    if (guessRemaining <= 0) {
      const timeout = window.setTimeout(() => void submitAnswer(""), 0);
      return () => window.clearTimeout(timeout);
    }
    const timer = window.setTimeout(() => setGuessRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [guessRemaining, phase, result, submitAnswer]);

  useEffect(() => {
    if (phase !== "guess" || answerMode !== "autocomplete" || answer.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void authApi<{ suggestions: Suggestion[] }>(`/api/catalog/suggest?type=anime&q=${encodeURIComponent(answer.trim())}`)
        .then((payload) => setSuggestions(payload.suggestions))
        .catch(() => setSuggestions([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [answer, answerMode, phase]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    if (answer) void submitAnswer(answer);
  };

  const progress = session ? phase === "preview" ? "1 / 3 · Đang phát preview" : phase === "guess" ? "2 / 3 · Chọn đáp án" : "3 / 3 · Reveal" : "Sẵn sàng";
  const revealTitle = result?.reveal.animeName || result?.reveal.gameName || result?.reveal.correctAnswer;

  return <section className="challenge-page media-quiz-page">
    <div className="challenge-topbar"><Link href="/play">← Thoát</Link><div><span>Opening / Ending Guess</span><i><b style={{ width: phase === "preview" ? "33%" : phase === "guess" ? "66%" : phase === "revealed" ? "100%" : "0%" }} /></i><small>{progress}</small></div><strong>{phase === "guess" ? guessRemaining : session?.previewDurationSeconds ?? 30}<small> SEC</small></strong></div>
    <div className="challenge-layout">
      <aside className="challenge-info"><p className="kicker"><span /> AnimeThemes live catalog</p><h1>{challenge?.mode === "anime_ending_guess" ? "Ending Guess" : "Opening Guess"}</h1><p>{challenge?.prompt ?? "Đang chọn challenge ngẫu nhiên..."}</p><div className="reward-box"><span>REWARD</span><b>◆ 1–3 fragments</b></div><p className="health-note">Visual luôn hiển thị. Preview phát tối đa 30 giây, sau đó bạn có đúng 20 giây để trả lời.</p></aside>
      <div className="challenge-console">
        {phase === "loading" && <div className="empty-state"><span>⌁</span><h2>Đang tải catalog</h2></div>}
        {phase === "ready" && <div className="empty-state"><span>▶</span><h2>Challenge đã sẵn sàng</h2><p>Nhấn bắt đầu, sau đó phát video. Form trả lời chỉ mở khi preview kết thúc.</p>{status === "authenticated" ? <button className="button primary" onClick={() => void start()} disabled={!challenge}>Bắt đầu challenge</button> : <Link className="button primary" href="/login">Đăng nhập để chơi</Link>}</div>}
        {session?.media && phase !== "ready" && phase !== "loading" && <GuessMediaPlayer
          mediaType={session.media.mediaType}
          playbackUrl={result?.reveal.fullPlaybackUrl || session.media.playbackUrl}
          previewStartSeconds={session.media.previewStartSeconds}
          previewDurationSeconds={session.media.previewDurationSeconds}
          visualMode="visible"
          maxReplays={0}
          revealed={phase === "revealed"}
          fullPlaybackAllowed={Boolean(result?.reveal.fullPlaybackAllowed)}
          onPreviewEnded={() => {
            setGuessRemaining(session.guessDurationSeconds);
            setPhase("guess");
          }}
          onStarted={() => {
            void authApi(`/api/game-sessions/${session.sessionId}/media-start`, { method: "POST" }).catch(() => setError("Không thể đồng bộ thời gian phát với backend."));
          }}
        />}
        {phase === "preview" && <div className="quiz-lock"><b>Đáp án đang khóa</b><span>Phát hết preview 30 giây để bắt đầu thời gian đoán.</span></div>}
        {phase === "guess" && <div className="quiz-answer-panel">
          <div className="answer-mode-tabs"><button className={answerMode === "multiple_choice" ? "active" : ""} onClick={() => { setAnswerMode("multiple_choice"); setAnswer(""); setSuggestions([]); }}>Trắc nghiệm</button><button className={answerMode === "autocomplete" ? "active" : ""} onClick={() => { setAnswerMode("autocomplete"); setAnswer(""); setSuggestions([]); }}>Nhập tên anime</button></div>
          {answerMode === "multiple_choice" ? <div className="option-grid">{session?.options.slice(0, 4).map((option, index) => <button className={answer === option ? "selected" : ""} type="button" onClick={() => setAnswer(option)} key={option}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div> :
          <form className="answer-box autocomplete-box" onSubmit={submitForm}><label htmlFor="anime-answer">Nhập tên anime</label><div><input id="anime-answer" value={answer} onChange={(event) => { const value = event.target.value; setAnswer(value); if (value.trim().length < 2) setSuggestions([]); }} placeholder="Ví dụ: attack..." autoComplete="off" /><button disabled={!answer || submitting}>Xác nhận →</button></div>{suggestions.length > 0 && <div className="suggestion-list">{suggestions.map((item) => <button type="button" key={item.id} onClick={() => { setAnswer(item.title); setSuggestions([]); }}><RemoteMediaImage src={item.cover} alt="" /><span><b>{item.title}</b><small>{item.alternativeTitles.slice(0, 2).join(" · ")}</small></span></button>)}</div>}</form>}
          {answerMode === "multiple_choice" && <button className="button primary submit-option" onClick={() => void submitAnswer(answer)} disabled={!answer || submitting}>Xác nhận đáp án</button>}
        </div>}
        {phase === "revealed" && result && <><div className={`result-panel ${result.correct ? "correct" : "wrong"}`}><span>{result.correct ? "✓" : "×"}</span><div><small>{result.correct ? "CHÍNH XÁC" : answer ? "CHƯA ĐÚNG" : "HẾT 20 GIÂY"}</small><h2>{revealTitle}</h2><p>Bài hát: <b>{result.reveal.title || "Chưa có tên"}</b></p><p>Artist: <b>{result.reveal.artist || "Chưa cập nhật"}</b></p>{result.reveal.attribution && <p className="attribution">{result.reveal.attribution}</p>}</div><aside><strong>+{result.score}</strong><small>điểm</small><b>◆ +{result.reward.fragments} fragments</b></aside></div><div className="result-actions">{result.reveal.officialSourceUrl && <a className="button ghost" href={result.reveal.officialSourceUrl} target="_blank" rel="noreferrer">Mở AnimeThemes</a>}<button className="button primary" onClick={() => { setPhase("loading"); setError(""); void loadRandomChallenge(); }}>Challenge ngẫu nhiên tiếp →</button></div></>}
        {error && <div className="admin-notice">{error}</div>}
      </div>
    </div>
  </section>;
}
