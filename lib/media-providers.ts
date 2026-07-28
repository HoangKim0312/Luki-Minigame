export type MediaCapability = {
  canPreview: boolean;
  maxPreviewSeconds: number | null;
  canPlayFullAfterReveal: boolean;
  canSeek: boolean;
  canAutoplay: boolean;
  canHideMetadataDuringGuess: boolean;
  requiresVisiblePlayer: boolean;
  requiresAttribution: boolean;
  requiresExternalFullPlayback: boolean;
};

export type MediaAssetInput = {
  sourceType: "remote_audio" | "remote_video" | "uploaded_audio" | "uploaded_video" | "embedded_video" | "official_embed" | "external_provider";
  sourceUrl: string;
  canPlayFullAfterReveal?: boolean;
  requiresVisiblePlayer?: boolean;
};

export interface MediaProviderAdapter {
  providerName: string;
  validateSource(sourceUrl: string): Promise<{ valid: boolean; reason?: string }>;
  getCapabilities(asset: MediaAssetInput): Promise<MediaCapability>;
  getPlaybackConfig(asset: MediaAssetInput, mode: "preview" | "revealed"): Promise<{ url: string; external: boolean }>;
  getAttribution(asset: MediaAssetInput): Promise<{ provider: string; sourceUrl: string }>;
}

function validatePublicHttpsUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    const forbidden = host === "localhost" || host === "0.0.0.0" || host === "::1" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    return url.protocol === "https:" && !forbidden;
  } catch {
    return false;
  }
}

class RemoteMediaAdapter implements MediaProviderAdapter {
  providerName = "remote";

  async validateSource(sourceUrl: string) {
    return validatePublicHttpsUrl(sourceUrl)
      ? { valid: true }
      : { valid: false, reason: "Chỉ chấp nhận HTTPS public URL; private network bị chặn." };
  }

  async getCapabilities(asset: MediaAssetInput): Promise<MediaCapability> {
    return {
      canPreview: true,
      maxPreviewSeconds: 30,
      canPlayFullAfterReveal: Boolean(asset.canPlayFullAfterReveal),
      canSeek: true,
      canAutoplay: false,
      canHideMetadataDuringGuess: true,
      requiresVisiblePlayer: Boolean(asset.requiresVisiblePlayer),
      requiresAttribution: true,
      requiresExternalFullPlayback: !asset.canPlayFullAfterReveal,
    };
  }

  async getPlaybackConfig(asset: MediaAssetInput, mode: "preview" | "revealed") {
    const external = mode === "revealed" && !asset.canPlayFullAfterReveal;
    return { url: asset.sourceUrl, external };
  }

  async getAttribution(asset: MediaAssetInput) {
    return { provider: this.providerName, sourceUrl: asset.sourceUrl };
  }
}

export const mediaProviderAdapters: Record<string, MediaProviderAdapter> = {
  remote_audio: new RemoteMediaAdapter(),
  remote_video: new RemoteMediaAdapter(),
  uploaded_audio: new RemoteMediaAdapter(),
  uploaded_video: new RemoteMediaAdapter(),
};

