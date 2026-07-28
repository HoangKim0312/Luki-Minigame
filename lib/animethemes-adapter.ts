const API_BASE = "https://api.animethemes.moe";

type AnimeThemesVideo = {
  id: number;
  basename: string;
  link: string;
  mimetype?: string;
  resolution?: number;
  nc?: boolean;
  subbed?: boolean;
  lyrics?: boolean;
};

type AnimeThemesEntry = {
  id: number;
  episodes?: string | null;
  nsfw?: boolean;
  spoiler?: boolean;
  version?: number;
  videos?: AnimeThemesVideo[];
};

type AnimeThemesTheme = {
  id: number;
  sequence?: number | null;
  slug: string;
  type: "OP" | "ED";
  song?: {
    title?: string;
    artists?: Array<{ name: string }>;
  };
  animethemeentries?: AnimeThemesEntry[];
};

type AnimeThemesAnime = {
  id: number;
  name: string;
  slug: string;
  year?: number | null;
  animethemes?: AnimeThemesTheme[];
};

type AnimeThemesResponse = { anime: AnimeThemesAnime[] };

export type AnimeThemeSearchResult = {
  provider: "animethemes";
  animeId: number;
  animeName: string;
  animeSlug: string;
  year: number | null;
  themeId: number;
  themeType: "OP" | "ED";
  sequence: number | null;
  songTitle: string;
  artists: string[];
  episodes: string | null;
  videoId: number;
  playbackUrl: string;
  basename: string;
  resolution: number | null;
  nsfw: boolean;
  spoiler: boolean;
  officialSourceUrl: string;
  attribution: string;
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function flattenAnime(anime: AnimeThemesAnime): AnimeThemeSearchResult[] {
  return (anime.animethemes ?? []).flatMap((theme) => {
    const entry = (theme.animethemeentries ?? []).find((item) => item.videos?.length);
    if (!entry) return [];
    const video = [...(entry.videos ?? [])].sort((left, right) =>
      Number(Boolean(right.nc)) - Number(Boolean(left.nc))
      || Number(Boolean(left.subbed)) - Number(Boolean(right.subbed))
      || (right.resolution ?? 0) - (left.resolution ?? 0)
    )[0];
    if (!video?.link?.startsWith("https://v.animethemes.moe/")) return [];
    const artists = theme.song?.artists?.map((artist) => artist.name).filter(Boolean) ?? [];
    return [{
      provider: "animethemes" as const,
      animeId: anime.id,
      animeName: anime.name,
      animeSlug: anime.slug,
      year: anime.year ?? null,
      themeId: theme.id,
      themeType: theme.type,
      sequence: theme.sequence ?? null,
      songTitle: theme.song?.title || `${theme.type}${theme.sequence ?? ""}`,
      artists,
      episodes: entry.episodes ?? null,
      videoId: video.id,
      playbackUrl: video.link,
      basename: video.basename,
      resolution: video.resolution ?? null,
      nsfw: Boolean(entry.nsfw),
      spoiler: Boolean(entry.spoiler),
      officialSourceUrl: `https://animethemes.moe/anime/${anime.slug}`,
      attribution: `Opening/ending metadata and remote video provided by AnimeThemes.moe · ${anime.name} ${theme.slug}`,
    }];
  });
}

async function requestAnime(params: URLSearchParams) {
  params.set("include", "animethemes.song.artists,animethemes.animethemeentries.videos");
  params.set("page[size]", "15");
  const response = await fetch(`${API_BASE}/anime?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "AniGame-Archive/1.0" },
  });
  if (!response.ok) throw new Error(`AnimeThemes unavailable (${response.status})`);
  return response.json() as Promise<AnimeThemesResponse>;
}

export class AnimeThemesAdapter {
  readonly providerName = "AnimeThemes";

  async searchThemes(query: string) {
    const params = new URLSearchParams();
    params.set("q", query.replace(/[%_]/g, " "));
    const payload = await requestAnime(params);
    return payload.anime.flatMap(flattenAnime);
  }

  async getAnimeThemes(slug: string) {
    const params = new URLSearchParams();
    params.set("q", slug.replace(/_/g, " "));
    const payload = await requestAnime(params);
    return payload.anime.filter((anime) => anime.slug === slug).flatMap(flattenAnime);
  }

  async findThemesForWorld(input: { title: string; alternativeTitles: string[]; year: number | null }) {
    const candidates = [input.title, ...input.alternativeTitles].filter(Boolean);
    for (const candidate of candidates) {
      const results = await this.searchThemes(candidate);
      const exact = results.filter((theme) =>
        normalize(theme.animeName) === normalize(candidate)
        && (!input.year || !theme.year || input.year === theme.year)
      );
      if (exact.length) return exact;
    }
    return [];
  }
}

export const animeThemesAdapter = new AnimeThemesAdapter();
