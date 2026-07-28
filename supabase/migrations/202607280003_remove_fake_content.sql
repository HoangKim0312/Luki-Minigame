-- Remove placeholder content from production and replace anime collectibles with
-- verified AniList character metadata. No binary asset is copied locally.

update public.media_worlds set
  title = 'Attack on Titan',
  slug = 'attack-on-titan',
  alternative_titles = '["Shingeki no Kyojin","進撃の巨人"]'::jsonb,
  cover_image_url = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg',
  banner_image_url = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
  description = 'Metadata and remote images provided by AniList.',
  genres = '["Action","Drama","Fantasy","Mystery"]'::jsonb,
  attribution = 'AniList · https://anilist.co/anime/16498',
  updated_at = now()
where id = 'world-aot';

update public.media_worlds set
  title = 'NieR:Automata',
  slug = 'nier-automata',
  alternative_titles = '["Nier Automata"]'::jsonb,
  description = 'Metadata and remote images provided by IGDB.',
  updated_at = now()
where id = 'world-nier';

update public.media_worlds set
  title = 'Persona 5',
  slug = 'persona-5',
  alternative_titles = '["P5"]'::jsonb,
  description = 'Metadata and remote images provided by IGDB.',
  updated_at = now()
where id = 'world-persona';

update public.media_worlds set
  title = 'Spirited Away',
  slug = 'spirited-away',
  alternative_titles = '["Sen to Chihiro no Kamikakushi","千と千尋の神隠し"]'::jsonb,
  cover_image_url = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-sWefXJvXkDOb.jpg',
  banner_image_url = 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-Sm2RU5PSqw7T.jpg',
  description = 'Metadata and remote images provided by AniList.',
  genres = '["Adventure","Drama","Fantasy","Supernatural"]'::jsonb,
  attribution = 'AniList · https://anilist.co/anime/199',
  updated_at = now()
where id = 'world-ghibli';

update public.media_worlds set
  title = 'VALORANT',
  slug = 'valorant',
  alternative_titles = '["Valorant"]'::jsonb,
  description = 'Metadata and remote images provided by IGDB.',
  updated_at = now()
where id = 'world-valor';

update public.media_worlds set
  title = 'Naruto',
  slug = 'naruto',
  alternative_titles = '["NARUTO","NARUTO -ナルト-"]'::jsonb,
  cover_image_url = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-dE6UHbFFg1A5.jpg',
  description = 'Metadata and remote images provided by AniList.',
  genres = '["Action","Adventure","Comedy","Drama","Fantasy","Supernatural"]'::jsonb,
  attribution = 'AniList · https://anilist.co/anime/20',
  updated_at = now()
where id = 'world-ninja';

-- These rows used unrelated images/media and must never be offered as content.
update public.collectibles
set status = 'disabled', updated_at = now()
where id in ('c1','c2','c3','c4','c5','c6');

update public.challenges
set status = 'disabled', updated_at = now()
where id in ('challenge-audio-1','challenge-video-1');

update public.challenges set
  world_id = 'world-nier',
  prompt = 'Virtuous Contract thuộc game nào?',
  correct_answer = 'NieR Automata',
  updated_at = now()
where id = 'challenge-asset-1';

insert into public.collectibles
  (id, world_id, name, slug, type, remote_image_url, source, source_id, rarity, fragment_requirement, metadata, status)
values
  ('anilist-character-40882','world-aot','Eren Yeager','eren-yeager','character','https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg','anilist','40882','common',3,'{"source_url":"https://anilist.co/character/40882"}','active'),
  ('anilist-character-40881','world-aot','Mikasa Ackerman','mikasa-ackerman','character','https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png','anilist','40881','common',3,'{"source_url":"https://anilist.co/character/40881"}','active'),
  ('anilist-character-46494','world-aot','Armin Arlert','armin-arlert','character','https://s4.anilist.co/file/anilistcdn/character/large/b46494-g7xYYuBtYPnO.png','anilist','46494','common',3,'{"source_url":"https://anilist.co/character/46494"}','active'),
  ('anilist-character-45627','world-aot','Levi','levi','character','https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png','anilist','45627','common',3,'{"source_url":"https://anilist.co/character/45627"}','active'),
  ('anilist-character-45887','world-aot','Sasha Blouse','sasha-blouse','character','https://s4.anilist.co/file/anilistcdn/character/large/b45887-QPtJH0KwqthW.jpg','anilist','45887','common',3,'{"source_url":"https://anilist.co/character/45887"}','active'),
  ('anilist-character-46484','world-aot','Reiner Braun','reiner-braun','character','https://s4.anilist.co/file/anilistcdn/character/large/b46484-P6A2GjNQn49F.png','anilist','46484','common',3,'{"source_url":"https://anilist.co/character/46484"}','active'),
  ('anilist-character-46490','world-aot','Annie Leonhart','annie-leonhart','character','https://s4.anilist.co/file/anilistcdn/character/large/b46490-tan274Ifc1Jf.jpg','anilist','46490','common',3,'{"source_url":"https://anilist.co/character/46490"}','active'),
  ('anilist-character-46496','world-aot','Erwin Smith','erwin-smith','character','https://s4.anilist.co/file/anilistcdn/character/large/b46496-Mu86MENd5wNB.png','anilist','46496','common',3,'{"source_url":"https://anilist.co/character/46496"}','active'),
  ('anilist-character-384','world-ghibli','Chihiro Ogino','chihiro-ogino','character','https://s4.anilist.co/file/anilistcdn/character/large/b384-AoWCsQyG0WI7.png','anilist','384','common',3,'{"source_url":"https://anilist.co/character/384"}','active'),
  ('anilist-character-385','world-ghibli','Haku','haku','character','https://s4.anilist.co/file/anilistcdn/character/large/b385-pKGCy3oYWxRa.png','anilist','385','common',3,'{"source_url":"https://anilist.co/character/385"}','active'),
  ('anilist-character-4716','world-ghibli','Yubaba','yubaba','character','https://s4.anilist.co/file/anilistcdn/character/large/b4716-8uiG2k2xQKvN.png','anilist','4716','common',3,'{"source_url":"https://anilist.co/character/4716"}','active'),
  ('anilist-character-5465','world-ghibli','Rin','rin','character','https://s4.anilist.co/file/anilistcdn/character/large/b5465-ZWJpBoYKPbAY.png','anilist','5465','common',3,'{"source_url":"https://anilist.co/character/5465"}','active'),
  ('anilist-character-8298','world-ghibli','Kaonashi','kaonashi','character','https://s4.anilist.co/file/anilistcdn/character/large/b8298-ATUVKng0oyHR.png','anilist','8298','common',3,'{"source_url":"https://anilist.co/character/8298"}','active'),
  ('anilist-character-8301','world-ghibli','Kamajii','kamajii','character','https://s4.anilist.co/file/anilistcdn/character/large/b8301-ASa313sbbcI3.png','anilist','8301','common',3,'{"source_url":"https://anilist.co/character/8301"}','active'),
  ('anilist-character-8305','world-ghibli','Zeniba','zeniba','character','https://s4.anilist.co/file/anilistcdn/character/large/b8305-EGm4vAcY75BG.jpg','anilist','8305','common',3,'{"source_url":"https://anilist.co/character/8305"}','active'),
  ('anilist-character-17','world-ninja','Naruto Uzumaki','naruto-uzumaki','character','https://s4.anilist.co/file/anilistcdn/character/large/b17-phjcWCkRuIhu.png','anilist','17','common',3,'{"source_url":"https://anilist.co/character/17"}','active'),
  ('anilist-character-13','world-ninja','Sasuke Uchiha','sasuke-uchiha','character','https://s4.anilist.co/file/anilistcdn/character/large/b13-SISLEw1oAD7a.png','anilist','13','common',3,'{"source_url":"https://anilist.co/character/13"}','active'),
  ('anilist-character-85','world-ninja','Kakashi Hatake','kakashi-hatake','character','https://s4.anilist.co/file/anilistcdn/character/large/b85-mkVBh2yjxjmx.png','anilist','85','common',3,'{"source_url":"https://anilist.co/character/85"}','active'),
  ('anilist-character-145','world-ninja','Sakura Haruno','sakura-haruno','character','https://s4.anilist.co/file/anilistcdn/character/large/b145-IorfpI8arxeX.png','anilist','145','common',3,'{"source_url":"https://anilist.co/character/145"}','active'),
  ('anilist-character-14','world-ninja','Itachi Uchiha','itachi-uchiha','character','https://s4.anilist.co/file/anilistcdn/character/large/b14-9Kb1E5oel1ke.png','anilist','14','common',3,'{"source_url":"https://anilist.co/character/14"}','active'),
  ('anilist-character-306','world-ninja','Rock Lee','rock-lee','character','https://s4.anilist.co/file/anilistcdn/character/large/b306-oUTOO45xInXt.png','anilist','306','common',3,'{"source_url":"https://anilist.co/character/306"}','active'),
  ('anilist-character-1555','world-ninja','Hinata Hyuuga','hinata-hyuuga','character','https://s4.anilist.co/file/anilistcdn/character/large/b1555-Q41GLTV3FvYF.png','anilist','1555','common',3,'{"source_url":"https://anilist.co/character/1555"}','active'),
  ('anilist-character-1662','world-ninja','Gaara','gaara','character','https://s4.anilist.co/file/anilistcdn/character/large/b1662-4E5J0LX9jZKZ.png','anilist','1662','common',3,'{"source_url":"https://anilist.co/character/1662"}','active')
on conflict (world_id, slug) do update set
  name = excluded.name,
  remote_image_url = excluded.remote_image_url,
  source = excluded.source,
  source_id = excluded.source_id,
  metadata = excluded.metadata,
  status = 'active',
  updated_at = now();

alter table public.media_assets
  add column if not exists media_world_id text references public.media_worlds(id) on delete set null;
alter table public.media_assets
  add column if not exists metadata jsonb not null default '{}';
create index if not exists media_assets_world_idx on public.media_assets(media_world_id);

create or replace function public.validate_media_asset_activation()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' and (
    new.approval_status <> 'approved'
    or new.media_world_id is null
    or nullif(trim(new.title), '') is null
    or nullif(trim(coalesce(new.attribution_text, '')), '') is null
    or nullif(trim(coalesce(new.license_note, '')), '') is null
    or nullif(trim(coalesce(new.official_source_url, '')), '') is null
  ) then
    raise exception 'Media chỉ được active sau khi duyệt, gắn đúng World, license, attribution và nguồn chính thức';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_media_asset_activation_trigger on public.media_assets;
create trigger validate_media_asset_activation_trigger
before insert or update on public.media_assets
for each row execute function public.validate_media_asset_activation();

create or replace function public.validate_media_challenge_activation()
returns trigger language plpgsql as $$
declare
  asset public.media_assets%rowtype;
begin
  if new.status = 'active' and new.game_mode in (
    'anime_opening_guess',
    'anime_ending_guess',
    'game_soundtrack_guess',
    'anime_video_guess',
    'game_video_guess',
    'sound_effect_guess',
    'character_voice_guess'
  ) then
    if new.media_asset_id is null then
      raise exception 'Media challenge phải có asset đã duyệt';
    end if;
    select * into asset from public.media_assets where id = new.media_asset_id;
    if asset.id is null
      or asset.status <> 'active'
      or asset.approval_status <> 'approved'
      or asset.media_world_id is distinct from new.world_id then
      raise exception 'Media challenge và asset phải active, approved và cùng Archive World';
    end if;
    if new.game_mode = 'anime_opening_guess' and asset.media_category <> 'anime_opening' then
      raise exception 'Anime Opening Guess chỉ nhận asset anime_opening';
    end if;
    if new.game_mode = 'anime_ending_guess' and asset.media_category <> 'anime_ending' then
      raise exception 'Anime Ending Guess chỉ nhận asset anime_ending';
    end if;
    if new.game_mode = 'game_soundtrack_guess' and asset.media_category not in ('game_soundtrack','game_boss_theme') then
      raise exception 'Game Soundtrack Guess chỉ nhận soundtrack của game';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_media_challenge_activation_trigger on public.challenges;
create trigger validate_media_challenge_activation_trigger
before insert or update on public.challenges
for each row execute function public.validate_media_challenge_activation();

-- A verified example imported from AnimeThemes JSON:API:
-- Shingeki no Kyojin / OP1 / Guren no Yumiya / Linked Horizon.
insert into public.media_assets (
  id, media_world_id, media_type, source_type, provider, source_url, playback_url,
  title, artist, anime_name, media_category, preview_start_seconds,
  preview_duration_seconds, can_preview, can_play_full_after_reveal,
  requires_external_full_playback, requires_visible_player, max_preview_seconds,
  license_type, license_note, copyright_owner, attribution_text,
  official_source_url, approval_status, status, metadata
) values (
  '00000000-0000-4000-8000-000000005279',
  'world-aot',
  'video',
  'remote_video',
  'animethemes',
  'https://v.animethemes.moe/ShingekiNoKyojin-OP1.webm',
  'https://v.animethemes.moe/ShingekiNoKyojin-OP1.webm',
  'Guren no Yumiya',
  'Linked Horizon',
  'Attack on Titan',
  'anime_opening',
  0,
  30,
  true,
  true,
  false,
  false,
  30,
  'provider-api',
  'Remote video is streamed directly from the media link returned by AnimeThemes JSON:API. No download, ripping, transcoding or audio extraction is performed.',
  'Respective rights holders',
  'Attack on Titan OP1 · Guren no Yumiya · Linked Horizon · AnimeThemes.moe',
  'https://animethemes.moe/anime/shingeki_no_kyojin',
  'approved',
  'active',
  '{"animeThemesAnimeId":2611,"animeThemesThemeId":5279,"animeThemesVideoId":4744,"themeType":"OP","sequence":1,"episodes":"1-13"}'::jsonb
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
  updated_at = now();

insert into public.media_asset_sources (media_asset_id, provider, source_url, capabilities)
select
  '00000000-0000-4000-8000-000000005279',
  'animethemes',
  'https://api.animethemes.moe/video/ShingekiNoKyojin-OP1.webm',
  '{"canPreview":true,"maxPreviewSeconds":30,"canPlayFullAfterReveal":true,"canSeek":true,"canAutoplay":false,"canHideMetadataDuringGuess":true,"requiresVisiblePlayer":false,"requiresAttribution":true,"requiresExternalFullPlayback":false}'::jsonb
where not exists (
  select 1 from public.media_asset_sources
  where media_asset_id = '00000000-0000-4000-8000-000000005279'
    and provider = 'animethemes'
);

insert into public.challenges (
  id, world_id, media_asset_id, game_mode, prompt, answer_type,
  correct_answer, visual_mode, max_replays, time_limit_seconds, status
) values (
  'animethemes-5279',
  'world-aot',
  '00000000-0000-4000-8000-000000005279',
  'anime_opening_guess',
  'Đoán anime từ opening này.',
  'anime',
  'Attack on Titan',
  'covered',
  1,
  35,
  'active'
)
on conflict (id) do update set
  world_id = excluded.world_id,
  media_asset_id = excluded.media_asset_id,
  prompt = excluded.prompt,
  correct_answer = excluded.correct_answer,
  status = 'active',
  updated_at = now();

delete from public.challenge_answers where challenge_id = 'animethemes-5279';
insert into public.challenge_answers (challenge_id, answer, normalized_answer)
values
  ('animethemes-5279','Attack on Titan','attack on titan'),
  ('animethemes-5279','Shingeki no Kyojin','shingeki no kyojin'),
  ('animethemes-5279','AOT','aot'),
  ('animethemes-5279','進撃の巨人','進撃の巨人');

insert into public.challenge_hints (challenge_id, type, content, position, score_cost)
values
  ('animethemes-5279','year','Anime phát hành năm 2013',1,250),
  ('animethemes-5279','artist','Opening do Linked Horizon trình bày',2,250)
on conflict (challenge_id, position) do update set
  type = excluded.type,
  content = excluded.content,
  score_cost = excluded.score_cost,
  updated_at = now();
