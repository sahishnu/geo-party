-- ============================================================
-- Geo Party — Supabase Schema
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enums
create type tile_type as enum (
  'solo', 'head_to_head', 'all_teams', 'misc',
  'start', 'jail', 'pot', 'pay_taxes', 'chance', 'random'
);

create type event_type as enum (
  'move', 'score_change', 'pot_contribution', 'pot_claim', 'card_reveal'
);

create type deck_type as enum ('chance', 'random');

-- teams (must be created before game_config due to FK)
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🎮',
  score integer not null default 0,
  position integer not null default 0,
  turn_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- game_config: single row (id = singleton)
create table game_config (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Geo Party',
  tiles_per_side integer not null default 9,
  jail_penalty integer not null default 50,
  tax_penalty integer not null default 30,
  pot_total integer not null default 0,
  current_team_id uuid references teams(id) on delete set null
);

-- tiles
create table tiles (
  id uuid primary key default gen_random_uuid(),
  position integer not null unique,
  label text not null default 'Unnamed Tile',
  image_url text,
  tile_type tile_type not null default 'misc',
  color_group text not null default 'yellow'
);

-- events (append-only log)
create table events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type event_type not null,
  team_id uuid references teams(id) on delete set null,
  spaces_moved integer,
  from_position integer,
  to_position integer,
  tile_label text,
  points_delta integer,
  notes text
);

-- cards (Chance and Random decks)
create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_type deck_type not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Insert the single game_config row
insert into game_config (game_name) values ('Geo Party');

-- ============================================================
-- Disable Row Level Security (no auth in this app)
-- ============================================================
alter table game_config disable row level security;
alter table teams disable row level security;
alter table tiles disable row level security;
alter table events disable row level security;
alter table cards disable row level security;

-- ============================================================
-- Enable real-time for all tables
-- (May need to enable via Supabase Dashboard > Database > Replication
--  if the publication doesn't exist yet)
-- ============================================================
alter publication supabase_realtime add table game_config;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table tiles;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table cards;
