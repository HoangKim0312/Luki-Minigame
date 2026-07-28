import postgres from "postgres";

const targetAnime = Math.max(100, Math.min(1000, Number(process.env.SYNC_ANIME_LIMIT || 300)));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = postgres(databaseUrl, { ssl: "require", max: 1 });
const apiBase = "https://api.animethemes.moe";

const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const deterministicUuid = (themeId) => `10000000-0000-4000-8000-${String(themeId).padStart(12, "0")}`;

function chooseVideo(theme) {
  const entries = theme.animethemeentries || [];
  for (const entry of entries) {
    if (entry.nsfw || entry.spoiler) continue;
    const videos = [...(entry.videos || [])]
      .filter((video) => typeof video.link === "string" && video.link.startsWith("https://v.animethemes.moe/"))
      .sort((left, right) =>
        Number(Boolean(right.nc)) - Number(Boolean(left.nc))
        || Number(Boolean(left.subbed)) - Number(Boolean(right.subbed))
        || (right.resolution || 0) - (left.resolution || 0)
      );
    if (videos[0]) return { entry, video: videos[0] };
  }
  return null;
}

async function fetchPage(page) {
  const params = new URLSearchParams({
    sort: "-updated_at",
    include: "images,animethemes.song.artists,animethemes.animethemeentries.videos",
    "page[size]": "100",
    "page[number]": String(page),
  });
  const response = await fetch(`${apiBase}/anime?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "AniGame-Archive-Catalog-Sync/1.0" },
  });
  if (!response.ok) throw new Error(`AnimeThemes page ${page} failed (${response.status})`);
  const remaining = response.headers.get("x-ratelimit-remaining");
  console.log(`AnimeThemes page ${page}: ${remaining ?? "?"} requests remaining`);
  return response.json();
}

const collected = [];
for (let page = 1; collected.length < targetAnime && page <= 20; page += 1) {
  const payload = await fetchPage(page);
  for (const anime of payload.anime || []) {
    const safeThemes = (anime.animethemes || []).filter((theme) => chooseVideo(theme));
    if (!safeThemes.length) continue;
    collected.push({ ...anime, safeThemes });
    if (collected.length >= targetAnime) break;
  }
  if (!(payload.anime || []).length) break;
}

const existingWorlds = await sql`select id, title, release_year from media_worlds`;
const worldByIdentity = new Map(existingWorlds.map((world) => [`${normalize(world.title)}:${world.release_year || 0}`, world.id]));
let worldCount = 0;
let challengeCount = 0;

await sql.begin(async (tx) => {
  for (const anime of collected) {
    const identity = `${normalize(anime.name)}:${anime.year || 0}`;
    const worldId = worldByIdentity.get(identity) || `animethemes-world-${anime.id}`;
    const slug = worldByIdentity.has(identity)
      ? (await tx`select slug from media_worlds where id = ${worldId}`)[0].slug
      : `anime-${anime.slug.replace(/_/g, "-")}-${anime.id}`;
    const cover = (anime.images || []).find((image) => image.facet === "Large Cover")?.link
      || (anime.images || []).find((image) => image.facet === "Small Cover")?.link
      || null;

    await tx`
      insert into media_worlds (
        id, source, source_id, type, title, slug, alternative_titles,
        cover_image_url, description, genres, release_year, attribution,
        license_note, metadata, status
      ) values (
        ${worldId}, 'animethemes', ${String(anime.id)}, 'anime', ${anime.name},
        ${slug}, '[]'::jsonb, ${cover}, ${anime.synopsis || ""},
        '[]'::jsonb, ${anime.year || null},
        ${`AnimeThemes · https://animethemes.moe/anime/${anime.slug}`},
        'Remote metadata and media URLs from AnimeThemes public API.',
        ${tx.json({ animeThemesAnimeId: anime.id, animeThemesSlug: anime.slug, season: anime.season, mediaFormat: anime.media_format })},
        'published'
      )
      on conflict (id) do update set
        source_id = excluded.source_id,
        title = excluded.title,
        cover_image_url = excluded.cover_image_url,
        description = excluded.description,
        release_year = excluded.release_year,
        attribution = excluded.attribution,
        metadata = excluded.metadata,
        status = 'published',
        updated_at = now()
    `;
    worldCount += 1;

    const selectedThemes = [];
    const opening = anime.safeThemes.find((theme) => theme.type === "OP");
    const ending = anime.safeThemes.find((theme) => theme.type === "ED");
    if (opening) selectedThemes.push(opening);
    if (ending) selectedThemes.push(ending);
    if (!selectedThemes.length && anime.safeThemes[0]) selectedThemes.push(anime.safeThemes[0]);

    for (const theme of selectedThemes) {
      const picked = chooseVideo(theme);
      if (!picked) continue;
      const mediaId = deterministicUuid(theme.id);
      const challengeId = `animethemes-${theme.id}`;
      const category = theme.type === "OP" ? "anime_opening" : "anime_ending";
      const mode = theme.type === "OP" ? "anime_opening_guess" : "anime_ending_guess";
      const artists = (theme.song?.artists || []).map((artist) => artist.name).filter(Boolean);
      const title = theme.song?.title || theme.slug;
      const officialSource = `https://animethemes.moe/anime/${anime.slug}`;
      const attribution = `${anime.name} ${theme.slug} · ${title}${artists.length ? ` · ${artists.join(", ")}` : ""} · AnimeThemes.moe`;

      await tx`
        insert into media_assets (
          id, media_world_id, media_type, source_type, provider, source_url,
          playback_url, title, artist, anime_name, media_category,
          preview_start_seconds, preview_duration_seconds, can_preview,
          can_play_full_after_reveal, requires_external_full_playback,
          requires_visible_player, max_preview_seconds, license_type,
          license_note, copyright_owner, attribution_text, official_source_url,
          approval_status, status, metadata
        ) values (
          ${mediaId}, ${worldId}, 'video', 'remote_video', 'animethemes',
          ${picked.video.link}, ${picked.video.link}, ${title},
          ${artists.join(", ") || "Unknown artist"}, ${anime.name}, ${category},
          0, 30, true, true, false, false, 30, 'provider-api',
          'Remote WebM is streamed from the URL returned by AnimeThemes. No download, ripping, transcoding or audio extraction is performed.',
          'Respective rights holders', ${attribution}, ${officialSource},
          'approved', 'active',
          ${tx.json({ animeThemesAnimeId: anime.id, animeThemesThemeId: theme.id, animeThemesVideoId: picked.video.id, themeType: theme.type, sequence: theme.sequence, episodes: picked.entry.episodes, basename: picked.video.basename })}
        )
        on conflict (id) do update set
          media_world_id = excluded.media_world_id,
          source_url = excluded.source_url,
          playback_url = excluded.playback_url,
          title = excluded.title,
          artist = excluded.artist,
          anime_name = excluded.anime_name,
          media_category = excluded.media_category,
          attribution_text = excluded.attribution_text,
          official_source_url = excluded.official_source_url,
          approval_status = 'approved',
          status = 'active',
          metadata = excluded.metadata,
          updated_at = now()
      `;

      await tx`
        insert into challenges (
          id, world_id, media_asset_id, game_mode, prompt, answer_type,
          correct_answer, visual_mode, max_replays, time_limit_seconds, status
        ) values (
          ${challengeId}, ${worldId}, ${mediaId}, ${mode},
          ${`Đoán anime từ ${theme.type === "OP" ? "opening" : "ending"} này.`},
          'anime', ${anime.name}, 'visible', 0, 20, 'active'
        )
        on conflict (id) do update set
          world_id = excluded.world_id,
          media_asset_id = excluded.media_asset_id,
          prompt = excluded.prompt,
          correct_answer = excluded.correct_answer,
          visual_mode = 'visible',
          max_replays = 0,
          time_limit_seconds = 20,
          status = 'active',
          updated_at = now()
      `;
      await tx`delete from challenge_answers where challenge_id = ${challengeId}`;
      await tx`
        insert into challenge_answers (challenge_id, answer, normalized_answer)
        values (${challengeId}, ${anime.name}, ${anime.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()})
      `;
      challengeCount += 1;
    }
  }
});

console.log(JSON.stringify({ requested: targetAnime, syncedWorlds: worldCount, syncedChallenges: challengeCount }));
await sql.end();
