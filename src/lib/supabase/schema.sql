-- ─── MY WILDEST DREAMS · Supabase Schema ──────────────────────────────────────
-- Run this in Supabase SQL Editor > New Query

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy dream search

-- ─── PROFILES ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  email           text not null,
  display_name    text,
  avatar_url      text,
  tier            text not null default 'dreamer' check (tier in ('dreamer', 'lucid', 'oracle')),
  streak_count    int not null default 0,
  total_dreams    int not null default 0,
  local_mode      boolean not null default false,
  notifications   boolean not null default true,
  preferred_wake  time,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── DREAMS ────────────────────────────────────────────────────────────────────

create table public.dreams (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,

  -- Input
  raw_transcription   text,
  audio_file_url      text,
  recorded_at         timestamptz not null default now(),

  -- AI parsing (stored as JSONB for flexibility)
  parsed_dream        jsonb,
  visual_style        text not null default 'surreal',
  render_status       text not null default 'idle',
  render_progress     int not null default 0 check (render_progress between 0 and 100),

  -- Output
  video_url           text,
  thumbnail_url       text,
  audioscape_url      text,
  duration_seconds    int,

  -- Meta
  tags                text[] default '{}',
  is_favorite         boolean not null default false,
  is_shared_to_feed   boolean not null default false,
  is_encrypted        boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.dreams enable row level security;

create policy "Users can crud own dreams"
  on dreams for all using (auth.uid() = user_id);

-- Full-text search index on transcription
create index dreams_transcription_fts
  on dreams using gin(to_tsvector('english', coalesce(raw_transcription, '')));

-- Filter indexes
create index dreams_user_created on dreams(user_id, created_at desc);
create index dreams_tags on dreams using gin(tags);
create index dreams_status on dreams(user_id, render_status);

-- ─── DREAM SYMBOLS ─────────────────────────────────────────────────────────────
-- Shared symbol dictionary (read-only to users)

create table public.dream_symbols (
  id              uuid default uuid_generate_v4() primary key,
  emoji           text not null,
  name            text not null unique,
  category        text not null,
  meaning         text not null,
  archetypes      text[] default '{}',
  emotional_tags  text[] default '{}',
  occurrence_count int not null default 0
);

alter table public.dream_symbols enable row level security;
create policy "Anyone can read symbols" on dream_symbols for select using (true);

-- ─── COMMUNITY FEED ────────────────────────────────────────────────────────────

create table public.community_posts (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  dream_id            uuid references public.dreams(id) on delete cascade not null,
  anonymous_handle    text not null,
  dream_excerpt       text not null,
  visual_style        text not null,
  thumbnail_url       text,
  dominant_symbols    text[] default '{}',
  dominant_emotion    text,
  reaction_counts     jsonb not null default '{}',
  comment_count       int not null default 0,
  is_visible          boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table public.community_posts enable row level security;

create policy "Anyone can read visible posts"
  on community_posts for select using (is_visible = true);

create policy "Users can manage own posts"
  on community_posts for all using (auth.uid() = user_id);

create index community_posts_created on community_posts(created_at desc);
create index community_posts_symbols on community_posts using gin(dominant_symbols);

-- ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  tier                text not null check (tier in ('dreamer', 'lucid', 'oracle')),
  ls_subscription_id  text,           -- Lemon Squeezy subscription ID
  ls_customer_id      text,
  ls_variant_id       text,
  status              text not null default 'active',
  current_period_end  timestamptz,
  cancel_at_period_end boolean default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "Users read own subscriptions"
  on subscriptions for select using (auth.uid() = user_id);

-- ─── STREAK TRACKING ───────────────────────────────────────────────────────────

create table public.dream_dates (
  user_id     uuid references public.profiles(id) on delete cascade,
  dream_date  date not null,
  primary key (user_id, dream_date)
);

alter table public.dream_dates enable row level security;
create policy "Users manage own dates"
  on dream_dates for all using (auth.uid() = user_id);

-- Streak recalculation function
create or replace function public.calculate_streak(p_user_id uuid)
returns int as $$
declare
  streak int := 0;
  check_date date := current_date;
begin
  loop
    if exists (select 1 from dream_dates where user_id = p_user_id and dream_date = check_date) then
      streak := streak + 1;
      check_date := check_date - 1;
    else
      exit;
    end if;
  end loop;
  return streak;
end;
$$ language plpgsql;

-- ─── UPDATED_AT TRIGGERS ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger dreams_updated_at before update on dreams
  for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function update_updated_at();
