"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  mediaType: "audio" | "video";
  playbackUrl: string;
  previewStartSeconds: number;
  previewDurationSeconds: number;
  visualMode: "visible" | "blurred" | "covered" | "audio_player";
  maxReplays: number;
  revealed: boolean;
  fullPlaybackAllowed: boolean;
  onPreviewEnded?: () => void;
};

export function GuessMediaPlayer({
  mediaType,
  playbackUrl,
  previewStartSeconds,
  previewDurationSeconds,
  visualMode,
  maxReplays,
  revealed,
  fullPlaybackAllowed,
  onPreviewEnded,
}: Props) {
  const playerRef = useRef<HTMLMediaElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [replays, setReplays] = useState(0);
  const [remaining, setRemaining] = useState(previewDurationSeconds);
  const [error, setError] = useState(false);
  const previewEnd = previewStartSeconds + previewDurationSeconds;

  const stopPreview = useCallback(() => {
    const player = playerRef.current;
    if (!player || revealed) return;
    player.pause();
    player.currentTime = previewEnd;
    setPlaying(false);
    setRemaining(0);
    onPreviewEnded?.();
  }, [onPreviewEnded, previewEnd, revealed]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const update = () => {
      if (revealed) return;
      const left = Math.max(0, previewEnd - player.currentTime);
      setRemaining(Math.ceil(left));
      if (player.currentTime >= previewEnd - 0.08) stopPreview();
    };
    player.addEventListener("timeupdate", update);
    return () => player.removeEventListener("timeupdate", update);
  }, [previewEnd, revealed, stopPreview]);

  useEffect(() => {
    if (!revealed) return;
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    player.currentTime = fullPlaybackAllowed ? 0 : previewStartSeconds;
    setPlaying(false);
  }, [fullPlaybackAllowed, previewStartSeconds, revealed]);

  const play = async () => {
    const player = playerRef.current;
    if (!player) return;
    if (!revealed) {
      if (started && remaining === 0) {
        if (replays >= maxReplays) return;
        setReplays((value) => value + 1);
      }
      if (!started || player.currentTime < previewStartSeconds || player.currentTime >= previewEnd) {
        player.currentTime = previewStartSeconds;
        setRemaining(previewDurationSeconds);
      }
    }
    try {
      await player.play();
      setStarted(true);
      setPlaying(true);
    } catch {
      setError(true);
    }
  };

  const pause = () => {
    playerRef.current?.pause();
    setPlaying(false);
  };

  const locked = !revealed && started && remaining === 0 && replays >= maxReplays;
  const mediaClass = revealed ? "revealed" : visualMode;
  const commonProps = {
    ref: playerRef as React.RefObject<HTMLVideoElement & HTMLAudioElement>,
    src: playbackUrl,
    preload: "metadata",
    onPause: () => setPlaying(false),
    onPlay: () => setPlaying(true),
    onError: () => setError(true),
  };

  if (error) {
    return <div className="media-error"><b>Không thể phát nguồn media</b><span>Challenge vẫn an toàn. Hãy thử lại hoặc báo cáo nội dung này.</span></div>;
  }

  return (
    <div className={`guess-player ${mediaClass}`}>
      <div className="media-stage">
        {mediaType === "video" ? (
          <video {...commonProps} playsInline controls={revealed && fullPlaybackAllowed} aria-label={revealed ? "Video đã reveal" : "Đoạn video thử thách"} />
        ) : (
          <audio {...commonProps} controls={revealed && fullPlaybackAllowed} aria-label={revealed ? "Audio đã reveal" : "Đoạn audio thử thách"} />
        )}
        {!revealed && mediaType === "video" && visualMode === "covered" && (
          <div className="visual-cover" aria-hidden="true"><span>VISUAL LOCKED</span><i>Đang phát video gốc kèm âm thanh</i></div>
        )}
      </div>
      {!revealed && (
        <div className="preview-controls">
          <button className="play-orb" type="button" onClick={playing ? pause : play} disabled={locked} aria-label={playing ? "Tạm dừng" : "Phát clip"}>
            {playing ? "Ⅱ" : "▶"}
          </button>
          <div className="preview-meter">
            <span style={{ width: `${100 - (remaining / previewDurationSeconds) * 100}%` }} />
          </div>
          <strong>00:{String(remaining).padStart(2, "0")}</strong>
          <small>Replay {Math.max(0, maxReplays - replays)}</small>
        </div>
      )}
      {locked && <p className="player-note">Đã dùng hết lượt phát. Gửi đáp án để reveal.</p>}
    </div>
  );
}

