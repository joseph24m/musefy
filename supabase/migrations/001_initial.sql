-- ============================================================
-- Muse YouTube Music PWA — Initial Schema
-- ============================================================

-- ── TABELLE (tutte prima, nessuna policy) ────────────────────

create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique,
  avatar_url  text,
  created_at  timestamptz default now()
);

create table public.playlists (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  cover_url   text,
  is_public   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.shared_playlists (
  id              uuid default gen_random_uuid() primary key,
  playlist_id     uuid references public.playlists(id) on delete cascade not null,
  invited_user_id uuid references public.profiles(id) on delete cascade not null,
  can_edit        boolean default false,
  invited_at      timestamptz default now(),
  unique(playlist_id, invited_user_id)
);

create table public.playlist_tracks (
  id          uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  track_id    text not null,
  title       text not null,
  channel     text not null,
  thumbnail   text not null,
  duration    integer default 0,
  position    integer not null,
  added_at    timestamptz default now()
);

create table public.favorites (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  track_id    text not null,
  title       text not null,
  channel     text not null,
  thumbnail   text not null,
  duration    integer default 0,
  added_at    timestamptz default now(),
  unique(user_id, track_id)
);

create table public.recently_played (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  track_id    text not null,
  title       text not null,
  channel     text not null,
  thumbnail   text not null,
  duration    integer default 0,
  played_at   timestamptz default now(),
  unique(user_id, track_id)
);

-- ── RLS (abilita dopo aver creato tutte le tabelle) ──────────

alter table public.profiles         enable row level security;
alter table public.playlists        enable row level security;
alter table public.shared_playlists enable row level security;
alter table public.playlist_tracks  enable row level security;
alter table public.favorites        enable row level security;
alter table public.recently_played  enable row level security;

-- profiles
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: own write"
  on public.profiles for all using (auth.uid() = id);

-- playlists
create policy "playlists: owner full access"
  on public.playlists for all using (auth.uid() = user_id);

create policy "playlists: public read"
  on public.playlists for select using (is_public = true);

create policy "playlists: shared read"
  on public.playlists for select using (
    exists (
      select 1 from public.shared_playlists sp
      where sp.playlist_id = id and sp.invited_user_id = auth.uid()
    )
  );

-- shared_playlists
create policy "shared_playlists: owner manages"
  on public.shared_playlists for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

create policy "shared_playlists: invitee reads own"
  on public.shared_playlists for select using (invited_user_id = auth.uid());

-- playlist_tracks
create policy "playlist_tracks: read if playlist accessible"
  on public.playlist_tracks for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (
          p.user_id = auth.uid()
          or p.is_public = true
          or exists (
            select 1 from public.shared_playlists sp
            where sp.playlist_id = p.id and sp.invited_user_id = auth.uid()
          )
        )
    )
  );

create policy "playlist_tracks: write if owner or editor"
  on public.playlist_tracks for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from public.shared_playlists sp
            where sp.playlist_id = p.id
              and sp.invited_user_id = auth.uid()
              and sp.can_edit = true
          )
        )
    )
  );

-- favorites
create policy "favorites: own access"
  on public.favorites for all using (auth.uid() = user_id);

-- recently_played
create policy "recently_played: own access"
  on public.recently_played for all using (auth.uid() = user_id);

-- ── FUNZIONI E TRIGGER ───────────────────────────────────────

-- Auto-crea profilo al signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at per playlists
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger playlists_updated_at
  before update on public.playlists
  for each row execute procedure public.set_updated_at();
