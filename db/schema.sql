create table if not exists players (
  id text primary key,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  lang text,
  streak_days int not null default 0
);
create table if not exists saves (
  player_id text primary key references players(id) on delete cascade,
  profile jsonb,
  game jsonb,
  fort_id text,
  skill text,
  room int,
  rooms_done int,
  score int,
  updated_at timestamptz not null default now()
);
create table if not exists forts (
  id text primary key,
  skill text not null,
  lang text,
  fort_name text,
  sample boolean not null default false,
  first_player text references players(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists ai_cache (
  prompt_hash text primary key,
  kind text not null,
  skill text,
  response text not null,
  refusal boolean not null default false,
  model text,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create table if not exists ai_calls (
  id bigint generated always as identity primary key,
  player_id text,
  kind text not null,
  cached boolean not null,
  ok boolean not null,
  model text,
  ms int,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_created_idx on ai_calls (created_at desc);
create table if not exists video_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists rate_hits (
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, window_start)
);
create index if not exists forts_skill_idx on forts (lower(skill));
create index if not exists players_seen_idx on players (last_seen desc);
