create extension if not exists pg_trgm;

create index if not exists media_worlds_title_trgm_idx
  on public.media_worlds using gin (title gin_trgm_ops)
  where status = 'published';

create index if not exists challenges_active_mode_idx
  on public.challenges(game_mode, created_at desc)
  where status = 'active';

update public.challenges
set visual_mode = 'visible',
    max_replays = 0,
    time_limit_seconds = 20,
    updated_at = now()
from (
  select c.id
  from public.challenges c
  join public.media_assets m on m.id = c.media_asset_id
  where m.provider = 'animethemes'
) as provider_challenge
where public.challenges.id = provider_challenge.id;
