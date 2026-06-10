-- ============================================================
-- Muse — Friendships & Shared Favorites
-- ============================================================

-- ── TABELLE ─────────────────────────────────────────────────

create table public.friendships (
  id            uuid default gen_random_uuid() primary key,
  requester_id  uuid references public.profiles(id) on delete cascade not null,
  addressee_id  uuid references public.profiles(id) on delete cascade not null,
  status        text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at    timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- Colonna shared su favorites
alter table public.favorites add column if not exists shared boolean default false;

-- ── RLS ─────────────────────────────────────────────────────

alter table public.friendships enable row level security;

-- Ogni utente vede le proprie richieste (inviate e ricevute)
create policy "friendships: own access"
  on public.friendships for all using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- Gli amici accettati possono vedere i preferiti condivisi
create policy "favorites: friends read shared"
  on public.favorites for select using (
    shared = true
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = user_id)
        )
    )
  );
