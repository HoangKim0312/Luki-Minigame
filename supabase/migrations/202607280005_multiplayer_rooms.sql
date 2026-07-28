create table if not exists public.multiplayer_rooms (
  id uuid primary key,
  code text not null unique check (char_length(code) = 6),
  host_id uuid not null references auth.users(id),
  mode text not null check (mode in ('opening', 'ending', 'mixed')),
  total_rounds integer not null check (total_rounds between 5 and 15),
  max_players integer not null check (max_players between 2 and 8),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.multiplayer_room_players (
  id uuid primary key,
  room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  ready boolean not null default false,
  score integer not null default 0,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.multiplayer_rounds (
  id uuid primary key,
  room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
  round_number integer not null,
  challenge_id text not null references public.challenges(id),
  correct_answer text not null,
  status text not null default 'active' check (status in ('active', 'revealed', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, round_number)
);

create table if not exists public.multiplayer_answers (
  id uuid primary key,
  room_id uuid not null references public.multiplayer_rooms(id) on delete cascade,
  round_number integer not null,
  user_id uuid not null references auth.users(id),
  submitted_answer text not null,
  is_correct boolean not null,
  score_awarded integer not null default 0,
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, round_number, user_id)
);

create index if not exists multiplayer_rooms_code_idx on public.multiplayer_rooms(code);
create index if not exists multiplayer_rooms_status_idx on public.multiplayer_rooms(status);
create index if not exists multiplayer_room_players_user_idx on public.multiplayer_room_players(user_id);
create index if not exists multiplayer_rounds_room_idx on public.multiplayer_rounds(room_id, round_number);
create index if not exists multiplayer_answers_room_idx on public.multiplayer_answers(room_id, round_number);
create index if not exists multiplayer_answers_user_idx on public.multiplayer_answers(user_id);
