export type MediaSearchResult = {
  source: "anilist" | "igdb";
  sourceId: string;
  type: "anime" | "game";
  title: string;
  alternativeTitles: string[];
  description: string;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  genres: string[];
  releaseYear: number | null;
  attribution: string;
  metadata: Record<string, unknown>;
};

export interface MediaSourceAdapter {
  searchMedia(query: string): Promise<MediaSearchResult[]>;
  getMediaDetails(sourceId: string): Promise<MediaSearchResult>;
  getCharacters(sourceId: string): Promise<Array<{ sourceId: string; name: string; remoteImageUrl: string | null }>>;
}

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

async function anilistRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`AniList unavailable (${response.status})`);
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (!payload.data) throw new Error(payload.errors?.[0]?.message ?? "AniList returned no data");
  return payload.data;
}

type AniListMedia = {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  description?: string;
  coverImage?: { extraLarge?: string };
  bannerImage?: string;
  genres?: string[];
  seasonYear?: number;
  siteUrl?: string;
};

function mapAniList(item: AniListMedia): MediaSearchResult {
  const titles = [item.title.english, item.title.romaji, item.title.native].filter((value): value is string => Boolean(value));
  return {
    source: "anilist",
    sourceId: String(item.id),
    type: "anime",
    title: titles[0] ?? `AniList #${item.id}`,
    alternativeTitles: [...new Set(titles.slice(1))],
    description: (item.description ?? "").replace(/<[^>]+>/g, ""),
    coverImageUrl: item.coverImage?.extraLarge ?? null,
    bannerImageUrl: item.bannerImage ?? null,
    genres: item.genres ?? [],
    releaseYear: item.seasonYear ?? null,
    attribution: `Metadata and remote images from AniList${item.siteUrl ? ` · ${item.siteUrl}` : ""}`,
    metadata: { officialSourceUrl: item.siteUrl },
  };
}

export class AniListAdapter implements MediaSourceAdapter {
  async searchMedia(query: string) {
    const data = await anilistRequest<{ Page: { media: AniListMedia[] } }>(
      `query ($search: String!) { Page(page: 1, perPage: 12) { media(search: $search, type: ANIME) { id title { romaji english native } description coverImage { extraLarge } bannerImage genres seasonYear siteUrl } } }`,
      { search: query },
    );
    return data.Page.media.map(mapAniList);
  }

  async getMediaDetails(sourceId: string) {
    const data = await anilistRequest<{ Media: AniListMedia }>(
      `query ($id: Int!) { Media(id: $id, type: ANIME) { id title { romaji english native } description coverImage { extraLarge } bannerImage genres seasonYear siteUrl } }`,
      { id: Number(sourceId) },
    );
    return mapAniList(data.Media);
  }

  async getCharacters(sourceId: string) {
    const data = await anilistRequest<{ Media: { characters: { nodes: Array<{ id: number; name: { full: string }; image?: { large?: string } }> } } }>(
      `query ($id: Int!) { Media(id: $id, type: ANIME) { characters(sort: ROLE, perPage: 25) { nodes { id name { full } image { large } } } } }`,
      { id: Number(sourceId) },
    );
    return data.Media.characters.nodes.map((item) => ({ sourceId: String(item.id), name: item.name.full, remoteImageUrl: item.image?.large ?? null }));
  }
}

export class IGDBAdapter implements MediaSourceAdapter {
  private async request(body: string) {
    const clientId = process.env.IGDB_CLIENT_ID;
    const token = process.env.IGDB_ACCESS_TOKEN;
    if (!clientId || !token) throw new Error("IGDB chưa được cấu hình trên backend.");
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "content-type": "text/plain" },
      body,
    });
    if (!response.ok) throw new Error(`IGDB unavailable (${response.status})`);
    return response.json() as Promise<Array<Record<string, unknown>>>;
  }

  private map(item: Record<string, unknown>): MediaSearchResult {
    const cover = item.cover as { image_id?: string } | undefined;
    const screenshots = item.screenshots as Array<{ image_id?: string }> | undefined;
    const genres = item.genres as Array<{ name?: string }> | undefined;
    const release = typeof item.first_release_date === "number" ? new Date(item.first_release_date * 1000).getUTCFullYear() : null;
    return {
      source: "igdb",
      sourceId: String(item.id),
      type: "game",
      title: String(item.name ?? `IGDB #${item.id}`),
      alternativeTitles: [],
      description: String(item.summary ?? ""),
      coverImageUrl: cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg` : null,
      bannerImageUrl: screenshots?.[0]?.image_id ? `https://images.igdb.com/igdb/image/upload/t_screenshot_huge/${screenshots[0].image_id}.jpg` : null,
      genres: genres?.flatMap((genre) => genre.name ? [genre.name] : []) ?? [],
      releaseYear: release,
      attribution: `Metadata and remote images from IGDB · https://www.igdb.com/games/${String(item.slug ?? "")}`,
      metadata: { slug: item.slug },
    };
  }

  async searchMedia(query: string) {
    const safe = query.replace(/["\\]/g, "");
    return (await this.request(`search "${safe}"; fields name,slug,summary,first_release_date,cover.image_id,screenshots.image_id,genres.name; limit 12;`)).map((item) => this.map(item));
  }

  async getMediaDetails(sourceId: string) {
    const [item] = await this.request(`where id = ${Number(sourceId)}; fields name,slug,summary,first_release_date,cover.image_id,screenshots.image_id,genres.name; limit 1;`);
    if (!item) throw new Error("Không tìm thấy game trên IGDB.");
    return this.map(item);
  }

  async getCharacters() {
    return [];
  }
}

export const sourceAdapters = { anilist: new AniListAdapter(), igdb: new IGDBAdapter() };

