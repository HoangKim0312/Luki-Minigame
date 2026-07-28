create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 1 and 40),
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin','creator')),
  selected_badge_id uuid,
  selected_title_id uuid,
  background_url text,
  streak integer not null default 0 check (streak >= 0),
  archive_score bigint not null default 0 check (archive_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'restorer'), '@', 1)), 40))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table if not exists public.media_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  adapter text not null unique,
  attribution text,
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_worlds (
  id text primary key,
  source text not null,
  source_id text not null,
  type text not null check (type in ('anime','game','franchise')),
  title text not null,
  slug text not null unique,
  alternative_titles jsonb not null default '[]',
  cover_image_url text,
  banner_image_url text,
  description text,
  genres jsonb not null default '[]',
  release_year integer,
  attribution text,
  license_note text,
  metadata jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists media_worlds_created_idx on public.media_worlds(created_at desc);

create table if not exists public.media_aliases (
  id uuid primary key default gen_random_uuid(),
  world_id text not null references public.media_worlds(id) on delete cascade,
  alias text not null,
  locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_aliases_world_idx on public.media_aliases(world_id);

create table if not exists public.collectibles (
  id text primary key,
  world_id text not null references public.media_worlds(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null check (type in ('character','weapon','item','location','boss','soundtrack','symbol','special_moment','other')),
  description text,
  remote_image_url text,
  source text,
  source_id text,
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','epic','legendary','secret')),
  fragment_requirement integer not null default 3 check (fragment_requirement > 0),
  unlock_requirement jsonb not null default '{"type":"fragment"}',
  metadata jsonb not null default '{}',
  status text not null default 'active' check (status in ('draft','active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (world_id, slug)
);
create index if not exists collectibles_world_idx on public.collectibles(world_id);

create table if not exists public.collectible_variants (
  id uuid primary key default gen_random_uuid(),
  collectible_id text not null references public.collectibles(id) on delete cascade,
  name text not null,
  remote_image_url text,
  unlock_requirement jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_sets (
  id uuid primary key default gen_random_uuid(),
  world_id text references public.media_worlds(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  completion_reward jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_set_items (
  collection_set_id uuid not null references public.collection_sets(id) on delete cascade,
  collectible_id text not null references public.collectibles(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_set_id, collectible_id)
);

create table if not exists public.user_fragments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  world_id text not null references public.media_worlds(id) on delete cascade,
  amount integer not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, world_id)
);
create index if not exists user_fragments_user_idx on public.user_fragments(user_id);

create table if not exists public.user_collectibles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collectible_id text not null references public.collectibles(id) on delete cascade,
  variant_id uuid references public.collectible_variants(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, collectible_id, variant_id)
);
create index if not exists user_collectibles_user_idx on public.user_collectibles(user_id);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('audio','video')),
  source_type text not null check (source_type in ('remote_audio','remote_video','uploaded_audio','uploaded_video','embedded_video','official_embed','external_provider')),
  provider text not null,
  source_url text,
  storage_key text,
  playback_url text,
  embed_url text,
  thumbnail_url text,
  title text not null,
  artist text,
  composer text,
  anime_name text,
  game_name text,
  media_category text not null,
  season_number integer,
  episode_number integer,
  preview_start_seconds integer not null default 0 check (preview_start_seconds >= 0),
  preview_duration_seconds integer not null default 30 check (preview_duration_seconds between 5 and 30),
  full_duration_seconds integer,
  can_preview boolean not null default true,
  can_play_full_after_reveal boolean not null default false,
  requires_external_full_playback boolean not null default true,
  requires_visible_player boolean not null default false,
  max_preview_seconds integer default 30 check (max_preview_seconds between 5 and 30),
  license_type text not null,
  license_note text not null,
  copyright_owner text,
  attribution_text text not null,
  official_source_url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approval_status text not null default 'needs_review' check (approval_status in ('pending','approved','rejected','needs_review')),
  status text not null default 'draft' check (status in ('draft','active','disabled','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_assets_status_idx on public.media_assets(status);
create index if not exists media_assets_provider_idx on public.media_assets(provider);
create index if not exists media_assets_type_idx on public.media_assets(media_type);
create index if not exists media_assets_approval_idx on public.media_assets(approval_status);

create table if not exists public.challenges (
  id text primary key,
  world_id text references public.media_worlds(id) on delete set null,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  game_mode text not null,
  prompt text not null,
  answer_type text not null default 'text',
  correct_answer text not null,
  base_score integer not null default 1000,
  reward_config jsonb not null default '{"fragments":3}',
  visual_mode text,
  max_replays integer not null default 1,
  time_limit_seconds integer not null default 45,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists challenges_world_idx on public.challenges(world_id);
create index if not exists challenges_media_idx on public.challenges(media_asset_id);

create table if not exists public.challenge_hints (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  type text not null,
  content text not null,
  position integer not null,
  score_cost integer not null default 250,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, position)
);

create table if not exists public.challenge_answers (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  answer text not null,
  normalized_answer text not null,
  locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists challenge_answers_challenge_idx on public.challenge_answers(challenge_id);

create table if not exists public.challenge_options (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  label text not null,
  statement_correct boolean,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null references public.challenges(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','expired','cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  answer_submitted_at timestamptz,
  hint_count integer not null default 0 check (hint_count >= 0),
  replay_count integer not null default 0 check (replay_count >= 0),
  score integer not null default 0 check (score >= 0),
  correct boolean,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_sessions_user_idx on public.game_sessions(user_id, created_at desc);
create index if not exists game_sessions_challenge_idx on public.game_sessions(challenge_id);

create table if not exists public.game_session_answers (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  submitted_answer text not null,
  correct boolean not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_session_hints (
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  hint_id uuid not null references public.challenge_hints(id) on delete cascade,
  opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_session_id, hint_id)
);

create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  timezone text not null default 'UTC',
  reward_config jsonb not null default '{}',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_challenge_items (
  daily_challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  challenge_id text not null references public.challenges(id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (daily_challenge_id, challenge_id)
);

create table if not exists public.daily_results (
  id uuid primary key default gen_random_uuid(),
  daily_challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_challenge_id, user_id)
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null,
  period_key text not null,
  score bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_key)
);
create index if not exists leaderboard_score_idx on public.leaderboard_entries(period_type, period_key, score desc);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.user_titles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  requirement jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.media_asset_sources (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  provider text not null,
  source_url text not null,
  capabilities jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_asset_reports (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  reporter_email text not null,
  reason text not null,
  details text,
  evidence_url text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_asset_reports_asset_idx on public.media_asset_reports(media_asset_id);

create table if not exists public.media_playback_sessions (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid not null unique references public.game_sessions(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  media_started_at timestamptz,
  replay_count integer not null default 0,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  config jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.award_challenge_reward(
  p_user_id uuid, p_world_id text, p_score integer, p_fragments integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_fragments (user_id, world_id, amount)
  values (p_user_id, p_world_id, greatest(p_fragments, 0))
  on conflict (user_id, world_id)
  do update set amount = user_fragments.amount + excluded.amount, updated_at = now();

  update public.profiles
  set archive_score = archive_score + greatest(p_score, 0), updated_at = now()
  where id = p_user_id;

  insert into public.leaderboard_entries (user_id, period_type, period_key, score)
  values (p_user_id, 'daily', current_date::text, greatest(p_score, 0))
  on conflict (user_id, period_type, period_key)
  do update set score = leaderboard_entries.score + excluded.score, updated_at = now();
end;
$$;

create or replace function public.complete_challenge_session(
  p_session_id uuid,
  p_user_id uuid,
  p_world_id text,
  p_score integer,
  p_fragments integer,
  p_correct boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session public.game_sessions%rowtype;
begin
  select * into v_session
  from public.game_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if v_session.id is null then raise exception 'Session không tồn tại'; end if;
  if v_session.status <> 'active' then raise exception 'Reward đã được xử lý'; end if;
  if v_session.expires_at < now() then
    update public.game_sessions set status = 'expired', updated_at = now() where id = p_session_id;
    raise exception 'Challenge đã hết hạn';
  end if;

  update public.game_sessions
  set status = 'completed',
      answer_submitted_at = now(),
      score = greatest(p_score, 0),
      correct = p_correct,
      reward_claimed_at = case when p_correct then now() else null end,
      updated_at = now()
  where id = p_session_id;

  if p_correct then
    perform public.award_challenge_reward(p_user_id, p_world_id, p_score, p_fragments);
  end if;

  return jsonb_build_object('claimed', true);
end;
$$;

create or replace function public.restore_collectible(
  p_user_id uuid, p_collectible_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_world_id text;
  v_cost integer;
  v_balance integer;
begin
  select world_id, fragment_requirement into v_world_id, v_cost
  from public.collectibles where id = p_collectible_id and status = 'active';
  if v_world_id is null then raise exception 'Collectible không tồn tại'; end if;
  if exists (select 1 from public.user_collectibles where user_id = p_user_id and collectible_id = p_collectible_id) then
    raise exception 'Collectible đã được restore';
  end if;
  select amount into v_balance from public.user_fragments where user_id = p_user_id and world_id = v_world_id for update;
  if coalesce(v_balance, 0) < v_cost then raise exception 'Không đủ fragment'; end if;
  update public.user_fragments set amount = amount - v_cost, updated_at = now() where user_id = p_user_id and world_id = v_world_id;
  insert into public.user_collectibles (user_id, collectible_id) values (p_user_id, p_collectible_id);
  return jsonb_build_object('restored', true, 'remaining_fragments', v_balance - v_cost);
end;
$$;

revoke all on function public.award_challenge_reward(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.award_challenge_reward(uuid,text,integer,integer) to service_role;
revoke all on function public.complete_challenge_session(uuid,uuid,text,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.complete_challenge_session(uuid,uuid,text,integer,integer,boolean) to service_role;
revoke all on function public.restore_collectible(uuid,text) from public, anon, authenticated;
grant execute on function public.restore_collectible(uuid,text) to service_role;

insert into public.media_sources (name, adapter, attribution, terms_url) values
  ('AniList','anilist','Metadata and remote images from AniList','https://anilist.co/terms'),
  ('IGDB','igdb','Metadata and remote images from IGDB','https://www.igdb.com/api')
on conflict (adapter) do nothing;

insert into public.media_worlds
  (id,source,source_id,type,title,slug,alternative_titles,cover_image_url,banner_image_url,description,genres,release_year,attribution,license_note,status)
values
  ('world-aot','anilist','16498','anime','Titan Archive','titan-archive','["Attack on Titan","Shingeki no Kyojin"]','https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-hbZ0b5Z29Frs.jpg','https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-R7m8D7kKMUCM.jpg','Những ký ức sau bức tường.','["Action","Drama","Mystery"]',2013,'AniList','Remote metadata only','published'),
  ('world-nier','igdb','11208','game','Android Requiem','android-requiem','["NieR:Automata"]','https://images.igdb.com/igdb/image/upload/t_cover_big/co5pcj.jpg','https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8m9k.jpg','Một kho lưu trữ về android.','["Action RPG","Sci-fi"]',2017,'IGDB','Remote metadata only','published'),
  ('world-persona','igdb','11156','game','Velvet Midnight','velvet-midnight','["Persona 5"]','https://images.igdb.com/igdb/image/upload/t_cover_big/co1nic.jpg','https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc6m5f.jpg','Mặt nạ và những mối liên kết.','["JRPG","Social sim"]',2016,'IGDB','Remote metadata only','published'),
  ('world-ghibli','anilist','199','anime','Spirit Skies','spirit-skies','["Spirited Away"]','https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-H6HjZAq2gYFQ.jpg','https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg','Những linh hồn và ký ức.','["Fantasy","Adventure"]',2001,'AniList','Remote metadata only','published'),
  ('world-valor','igdb','126459','game','Protocol Zero','protocol-zero','["Valorant"]','https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg','https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc8unf.jpg','Hồ sơ chiến thuật.','["Tactical","Shooter"]',2020,'IGDB','Remote metadata only','published'),
  ('world-ninja','anilist','20','anime','Hidden Leaf Records','hidden-leaf-records','["Naruto"]','https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-YJvLbgJQPCoI.jpg','https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD13a.jpg','Biên niên sử về ý chí.','["Action","Adventure"]',2002,'AniList','Remote metadata only','published')
on conflict (id) do nothing;

insert into public.collectibles
  (id,world_id,name,slug,type,description,remote_image_url,source,rarity,fragment_requirement,status)
values
  ('c1','world-nier','YoRHa Unit 2B','yorha-unit-2b','character','Android chiến đấu của YoRHa.','https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9k.jpg','igdb','legendary',10,'active'),
  ('c2','world-nier','Virtuous Contract','virtuous-contract','weapon','Thanh kiếm ký ức.','https://images.igdb.com/igdb/image/upload/t_1080p/sc8m9l.jpg','igdb','rare',5,'active'),
  ('c3','world-aot','Wings of Freedom','wings-of-freedom','symbol','Biểu tượng của tự do.','https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-R7m8D7kKMUCM.jpg','anilist','epic',8,'active'),
  ('c4','world-persona','Phantom Mask','phantom-mask','item','Một chiếc mặt nạ.','https://images.igdb.com/igdb/image/upload/t_1080p/sc6m5f.jpg','igdb','rare',5,'active'),
  ('c5','world-ghibli','Spirit Token','spirit-token','special_moment','Mảnh ký ức linh hồn.','https://s4.anilist.co/file/anilistcdn/media/anime/banner/199-HXoIA94FBOCo.jpg','anilist','secret',10,'active'),
  ('c6','world-valor','Protocol Blade','protocol-blade','weapon','Một vũ khí chiến thuật.','https://images.igdb.com/igdb/image/upload/t_1080p/sc8unf.jpg','igdb','uncommon',3,'active')
on conflict (id) do nothing;

insert into public.challenges
  (id,world_id,game_mode,prompt,answer_type,correct_answer,visual_mode,status)
values
  ('challenge-hint-1','world-nier','hint_ladder','Archive World nào đang được mô tả?','text','NieR Automata',null,'active'),
  ('challenge-crop-1','world-aot','cropped_memory','Ký ức hình ảnh này thuộc Archive World nào?','text','Attack on Titan','blurred','active'),
  ('challenge-character-1','world-nier','character_trail','Nhân vật nào để lại dấu vết này?','text','2B',null,'active'),
  ('challenge-asset-1','world-persona','asset_link','Biểu tượng mặt nạ này liên kết với Archive World nào?','multiple_choice','Persona 5',null,'active'),
  ('challenge-wrong-1','world-nier','wrong_information','Chọn thông tin sai về NieR:Automata.','multiple_choice','Được phát triển bởi Ubisoft',null,'active'),
  ('challenge-audio-1','world-aot','anime_opening_guess','Đoán anime từ đoạn opening được cấp phép.','text','Attack on Titan','audio_player','active'),
  ('challenge-video-1','world-ghibli','anime_video_guess','Đoán Archive World từ đoạn video có âm thanh.','text','Spirit Skies','covered','active')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('licensed-media','licensed-media',false,262144000,array['audio/mpeg','audio/ogg','audio/wav','video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.user_fragments enable row level security;
alter table public.user_collectibles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.daily_results enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);
drop policy if exists "own fragments read" on public.user_fragments;
create policy "own fragments read" on public.user_fragments for select using (auth.uid() = user_id);
drop policy if exists "own collectibles read" on public.user_collectibles;
create policy "own collectibles read" on public.user_collectibles for select using (auth.uid() = user_id);
drop policy if exists "own sessions read" on public.game_sessions;
create policy "own sessions read" on public.game_sessions for select using (auth.uid() = user_id);
drop policy if exists "own daily results read" on public.daily_results;
create policy "own daily results read" on public.daily_results for select using (auth.uid() = user_id);
