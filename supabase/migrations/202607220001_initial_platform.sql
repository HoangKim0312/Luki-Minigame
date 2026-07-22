create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'admin')),
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'player'), '@', 1)), 40),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'vi' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.game_definitions (
  id text primary key,
  kind text not null,
  icon text not null default '✦',
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  topic text not null default '',
  questions jsonb not null default '{"vi":[],"en":[]}'::jsonb,
  min_players integer not null default 2 check (min_players >= 1),
  max_players integer not null default 8 check (max_players >= min_players),
  estimated_minutes text not null default '10–20',
  tone text not null default 'sky',
  published boolean not null default false,
  ai_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists game_definitions_set_updated_at on public.game_definitions;
create trigger game_definitions_set_updated_at
before update on public.game_definitions
for each row execute function public.set_updated_at();

create table if not exists public.trivia_quizzes (
  id text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '',
  cover_emoji text not null default '🧠',
  cover_image text,
  category text not null default 'Party',
  language text not null default 'vi',
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  creator_name text not null default 'Luki',
  play_count bigint not null default 0 check (play_count >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trivia_quizzes_owner_idx on public.trivia_quizzes(owner_id, updated_at desc);
create index if not exists trivia_quizzes_visibility_idx on public.trivia_quizzes(visibility, play_count desc);
create index if not exists trivia_quizzes_category_idx on public.trivia_quizzes(category);

drop trigger if exists trivia_quizzes_set_updated_at on public.trivia_quizzes;
create trigger trivia_quizzes_set_updated_at
before update on public.trivia_quizzes
for each row execute function public.set_updated_at();

create table if not exists public.trivia_questions (
  id text primary key,
  quiz_id text not null references public.trivia_quizzes(id) on delete cascade,
  position integer not null check (position >= 0),
  type text not null check (type in ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','TEXT_INPUT','NUMBER_INPUT','SCALE','POLL','ORDER','MATCHING','IMAGE_CHOICE')),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  description text,
  config jsonb not null default '{}'::jsonb,
  media jsonb,
  time_limit_seconds integer not null default 20 check (time_limit_seconds between 1 and 600),
  scoring_mode text not null default 'STANDARD' check (scoring_mode in ('STANDARD','ACCURACY_ONLY','DOUBLE_POINTS','NO_POINTS')),
  explanation text,
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY','MEDIUM','HARD')),
  category text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, position)
);

create index if not exists trivia_questions_quiz_idx on public.trivia_questions(quiz_id, position);

drop trigger if exists trivia_questions_set_updated_at on public.trivia_questions;
create trigger trivia_questions_set_updated_at
before update on public.trivia_questions
for each row execute function public.set_updated_at();

create table if not exists public.trivia_question_options (
  id text primary key,
  question_id text not null references public.trivia_questions(id) on delete cascade,
  position integer not null check (position >= 0),
  text text,
  image_url text,
  emoji text,
  is_correct boolean not null default false,
  order_index integer,
  match_with text,
  created_at timestamptz not null default now(),
  unique (question_id, position)
);

create index if not exists trivia_options_question_idx on public.trivia_question_options(question_id, position);

create table if not exists public.game_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  game_id text not null references public.game_definitions(id),
  quiz_id text references public.trivia_quizzes(id) on delete set null,
  host_user_id uuid references public.profiles(id) on delete set null,
  language text not null default 'vi' check (language in ('vi', 'en')),
  phase text not null default 'lobby',
  round_count integer not null default 1,
  current_round integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create index if not exists game_rooms_expires_idx on public.game_rooms(expires_at);

drop trigger if exists game_rooms_set_updated_at on public.game_rooms;
create trigger game_rooms_set_updated_at
before update on public.game_rooms
for each row execute function public.set_updated_at();

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  resume_token_hash text not null,
  is_host boolean not null default false,
  is_bot boolean not null default false,
  ready boolean not null default false,
  connected boolean not null default true,
  score bigint not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_code, resume_token_hash)
);

create unique index if not exists room_participants_user_unique
on public.room_participants(room_code, user_id)
where user_id is not null;
create index if not exists room_participants_room_idx on public.room_participants(room_code, score desc);

drop trigger if exists room_participants_set_updated_at on public.room_participants;
create trigger room_participants_set_updated_at
before update on public.room_participants
for each row execute function public.set_updated_at();

create table if not exists public.room_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  participant_id uuid references public.room_participants(id) on delete set null,
  sender_name text not null,
  message text not null check (char_length(message) between 1 and 400),
  created_at timestamptz not null default now()
);

create index if not exists room_chat_room_created_idx on public.room_chat_messages(room_code, created_at);

create table if not exists public.trivia_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique references public.game_rooms(code) on delete set null,
  quiz_id text references public.trivia_quizzes(id) on delete set null,
  quiz_snapshot jsonb not null,
  status text not null default 'lobby' check (status in ('lobby','active','paused','finished','abandoned')),
  current_question_index integer not null default 0,
  question_started_at timestamptz,
  question_ends_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trivia_sessions_quiz_idx on public.trivia_sessions(quiz_id, created_at desc);

drop trigger if exists trivia_sessions_set_updated_at on public.trivia_sessions;
create trigger trivia_sessions_set_updated_at
before update on public.trivia_sessions
for each row execute function public.set_updated_at();

create table if not exists public.trivia_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trivia_sessions(id) on delete cascade,
  room_participant_id uuid references public.room_participants(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  total_score bigint not null default 0,
  correct_count integer not null default 0,
  answered_count integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  fastest_answer_ms integer,
  final_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, room_participant_id)
);

create index if not exists trivia_session_participants_rank_idx on public.trivia_session_participants(session_id, total_score desc);

drop trigger if exists trivia_session_participants_set_updated_at on public.trivia_session_participants;
create trigger trivia_session_participants_set_updated_at
before update on public.trivia_session_participants
for each row execute function public.set_updated_at();

create table if not exists public.trivia_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trivia_sessions(id) on delete cascade,
  session_participant_id uuid not null references public.trivia_session_participants(id) on delete cascade,
  question_id text not null,
  answer jsonb not null,
  submitted_at timestamptz not null,
  response_time_ms integer not null check (response_time_ms >= 0),
  potential_score integer not null default 0 check (potential_score >= 0),
  is_correct boolean,
  awarded_score integer not null default 0 check (awarded_score >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, session_participant_id, question_id)
);

create index if not exists trivia_answers_session_question_idx on public.trivia_answers(session_id, question_id);

create table if not exists public.trivia_score_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trivia_sessions(id) on delete cascade,
  session_participant_id uuid not null references public.trivia_session_participants(id) on delete cascade,
  question_id text,
  points integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, session_participant_id, question_id, reason)
);

create index if not exists trivia_score_events_participant_idx on public.trivia_score_events(session_participant_id, created_at);

create table if not exists public.quiz_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id text not null references public.trivia_quizzes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quiz_id)
);

insert into public.game_definitions (id, kind, icon, name, description, min_players, max_players, estimated_minutes, tone, published, ai_enabled)
values
  ('trivia','trivia','🧠','{"vi":"Trivia","en":"Trivia"}','{"vi":"Thi đấu bằng bộ câu hỏi tùy chỉnh.","en":"Play custom quiz sets."}',2,16,'10–25','amber',true,true),
  ('wavelength','match','≈','{"vi":"Chung Tần Số","en":"Same Wavelength"}','{"vi":"Cùng trả lời và tìm đáp án trùng nhau.","en":"Find matching answers."}',2,8,'10–15','lime',true,true),
  ('who-said-it','guess-author','?','{"vi":"Ai Đã Nói?","en":"Who Said It?"}','{"vi":"Đoán chủ nhân của đáp án bí mật.","en":"Guess who wrote each answer."}',3,10,'15–25','coral',true,true),
  ('number','number','37','{"vi":"Nghĩ Quanh Con Số","en":"Think Around the Number"}','{"vi":"Đoán con số bí mật 0–99.","en":"Guess secret numbers from 0–99."}',2,8,'∞','violet',true,false),
  ('convergence','convergence','↑','{"vi":"Điểm Giao Nhau","en":"Word Convergence"}','{"vi":"Tìm từ chung giữa hai suy nghĩ.","en":"Converge on the same word."}',2,2,'∞','sky',true,false),
  ('hot-take','prompt','✦','{"vi":"Ý Kiến Nóng","en":"Hot Takes"}','{"vi":"Chọn một phía và kể câu chuyện.","en":"Choose a side and tell the story."}',2,12,'10–20','sky',true,true)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.game_definitions enable row level security;
alter table public.trivia_quizzes enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_question_options enable row level security;
alter table public.game_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_chat_messages enable row level security;
alter table public.trivia_sessions enable row level security;
alter table public.trivia_session_participants enable row level security;
alter table public.trivia_answers enable row level security;
alter table public.trivia_score_events enable row level security;
alter table public.quiz_favorites enable row level security;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists games_public_read on public.game_definitions;
create policy games_public_read on public.game_definitions for select to anon, authenticated using (published = true);

drop policy if exists quizzes_read_accessible on public.trivia_quizzes;
create policy quizzes_read_accessible on public.trivia_quizzes for select to anon, authenticated
using (visibility = 'public' or owner_id = auth.uid());
drop policy if exists quizzes_insert_owner on public.trivia_quizzes;
create policy quizzes_insert_owner on public.trivia_quizzes for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists quizzes_update_owner on public.trivia_quizzes;
create policy quizzes_update_owner on public.trivia_quizzes for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists quizzes_delete_owner on public.trivia_quizzes;
create policy quizzes_delete_owner on public.trivia_quizzes for delete to authenticated using (owner_id = auth.uid());

drop policy if exists questions_read_accessible on public.trivia_questions;
create policy questions_read_accessible on public.trivia_questions for select to authenticated
using (exists (select 1 from public.trivia_quizzes q where q.id = quiz_id and q.owner_id = auth.uid()));
drop policy if exists questions_owner_all on public.trivia_questions;
create policy questions_owner_all on public.trivia_questions for all to authenticated
using (exists (select 1 from public.trivia_quizzes q where q.id = quiz_id and q.owner_id = auth.uid()))
with check (exists (select 1 from public.trivia_quizzes q where q.id = quiz_id and q.owner_id = auth.uid()));

drop policy if exists options_read_accessible on public.trivia_question_options;
create policy options_read_accessible on public.trivia_question_options for select to authenticated
using (exists (select 1 from public.trivia_questions tq join public.trivia_quizzes q on q.id = tq.quiz_id where tq.id = question_id and q.owner_id = auth.uid()));
drop policy if exists options_owner_all on public.trivia_question_options;
create policy options_owner_all on public.trivia_question_options for all to authenticated
using (exists (select 1 from public.trivia_questions tq join public.trivia_quizzes q on q.id = tq.quiz_id where tq.id = question_id and q.owner_id = auth.uid()))
with check (exists (select 1 from public.trivia_questions tq join public.trivia_quizzes q on q.id = tq.quiz_id where tq.id = question_id and q.owner_id = auth.uid()));

drop policy if exists favorites_self_all on public.quiz_favorites;
create policy favorites_self_all on public.quiz_favorites for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.game_rooms, public.room_participants, public.room_chat_messages, public.trivia_sessions, public.trivia_session_participants, public.trivia_answers, public.trivia_score_events from anon, authenticated;
grant select on public.game_definitions to anon, authenticated;
grant select on public.trivia_quizzes to anon, authenticated;
grant select on public.trivia_questions, public.trivia_question_options to authenticated;
grant insert, update, delete on public.trivia_quizzes, public.trivia_questions, public.trivia_question_options to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;
grant select, insert, delete on public.quiz_favorites to authenticated;
