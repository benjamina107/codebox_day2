-- Username is the only player-facing credential, by project requirement.
-- Random session tokens remain private to HTTP-only cookies.
alter table public.poop_players drop column token_hash;
create table public.poop_sessions (
  token_hash text primary key check (length(token_hash) = 64),
  player_id uuid not null references public.poop_players(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index poop_sessions_player on public.poop_sessions(player_id);
create index poop_sessions_expiry on public.poop_sessions(expires_at);
alter table public.poop_sessions enable row level security;
revoke all on public.poop_sessions from anon, authenticated;
grant select, insert, update, delete on public.poop_sessions to service_role;
