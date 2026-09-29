-- Private token-based access goes through Express. Browser roles have no access.
create table public.poop_players (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now()
);
create table public.poop_games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.poop_players(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  state jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_state_shape check (jsonb_typeof(state) = 'object' and jsonb_typeof(state->'poops') = 'array')
);
create index poop_games_player_updated on public.poop_games(player_id, updated_at desc);
alter table public.poop_players enable row level security;
alter table public.poop_games enable row level security;
revoke all on public.poop_players, public.poop_games from anon, authenticated;
grant select, insert, update, delete on public.poop_players, public.poop_games to service_role;
