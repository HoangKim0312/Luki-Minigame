alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists selected_badge_id uuid;
alter table public.profiles add column if not exists selected_title_id uuid;
alter table public.profiles add column if not exists background_url text;
alter table public.profiles add column if not exists streak integer not null default 0;
alter table public.profiles add column if not exists archive_score bigint not null default 0;

update public.profiles
set username = left(coalesce(nullif(username, ''), nullif(display_name, ''), 'restorer'), 30)
  || case when username is null or username = '' then '-' || left(id::text, 6) else '' end
where username is null or username = '';

update public.profiles
set display_name = coalesce(nullif(display_name, ''), username)
where display_name is null or display_name = '';

alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_unique_idx on public.profiles(username);

alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role = 'player';
alter table public.profiles alter column role set default 'user';
alter table public.profiles
  add constraint profiles_role_check check (role in ('user','admin','creator'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'restorer'), '@', 1)), 40);
  insert into public.profiles (id, username, display_name)
  values (new.id, v_name, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
