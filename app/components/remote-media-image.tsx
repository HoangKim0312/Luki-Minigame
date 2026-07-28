"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  challengeStage?: number;
};

export function RemoteMediaImage({ src, alt, className = "", challengeStage }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stageClass = challengeStage === undefined ? "" : ` memory-stage-${Math.min(3, Math.max(0, challengeStage))}`;

  return (
    <span className={`remote-media ${loaded ? "is-loaded" : ""}${stageClass} ${className}`}>
      {!loaded && <span className="image-skeleton" aria-hidden="true" />}
      {src && !failed ? (
        // Remote URLs remain remote by design; no asset proxy or local copy is created.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      ) : (
        <span className="image-fallback" role="img" aria-label={`Không tải được ảnh: ${alt}`}>
          <span>✦</span>
          <small>Ký ức chưa thể phục hồi</small>
        </span>
      )}
    </span>
  );
}

