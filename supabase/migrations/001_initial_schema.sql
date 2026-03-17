-- ─── My Wildest Dreams — Initial Schema ──────────────────────────────────────
-- Run via: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- for future embedding search

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  avatar_url            TEXT,
  tier                  TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','lucid','oracle')),
  stripe_customer_id    TEXT,
  streak_count          INT NOT NULL DEFAULT 0,
  last_dream_date       DATE,
  total_dreams          INT NOT NULL DEFAULT 0,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  trial_ends_at         TIMESTAMPTZ,
  preferences           JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Dreams ───────────────────────────────────────────────────────────────────
CREATE TABLE dreams (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL DEFAULT '',
  raw_transcription      TEXT NOT NULL DEFAULT '',
  edited_transcription   TEXT NOT NULL DEFAULT '',
  style                  TEXT NOT NULL DEFAULT 'surreal',
  style_override         BOOLEAN NOT NULL DEFAULT FALSE,
  emotions               TEXT[] NOT NULL DEFAULT '{}',
  tags                   TEXT[] NOT NULL DEFAULT '{}',
  symbols                JSONB NOT NULL DEFAULT '[]',
  narrative_arcs         TEXT[] NOT NULL DEFAULT '{}',
  audio_url              TEXT,
  video_url              TEXT,
  thumbnail_url          TEXT,
  duration_seconds       INT NOT NULL DEFAULT 0,
  render_status          TEXT NOT NULL DEFAULT 'pending'
                           CHECK (render_status IN ('pending','transcribing','parsing','styling','rendering','complete','failed')),
  is_private             BOOLEAN NOT NULL DEFAULT TRUE,
  is_favorited           BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared              BOOLEAN NOT NULL DEFAULT FALSE,
  share_id               TEXT UNIQUE,
  metadata               JSONB NOT NULL DEFAULT '{}',
  search_vector          TSVECTOR, -- auto-updated by trigger
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX dreams_search_idx ON dreams USING GIN(search_vector);
CREATE INDEX dreams_user_id_idx ON dreams(user_id);
CREATE INDEX dreams_created_at_idx ON dreams(created_at DESC);
CREATE INDEX dreams_tags_idx ON dreams USING GIN(tags);
CREATE INDEX dreams_emotions_idx ON dreams USING GIN(emotions);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_dream_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.edited_transcription, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dreams_search_vector_update
  BEFORE INSERT OR UPDATE ON dreams
  FOR EACH ROW EXECUTE FUNCTION update_dream_search_vector();

-- ─── Render Jobs ──────────────────────────────────────────────────────────────
CREATE TABLE render_jobs (
  id                          TEXT PRIMARY KEY,
  dream_id                    UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES profiles(id),
  status                      TEXT NOT NULL DEFAULT 'pending',
  progress                    INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  current_step                TEXT NOT NULL DEFAULT 'transcribing',
  estimated_seconds           INT NOT NULL DEFAULT 0,
  video_url                   TEXT,
  error                       TEXT,
  started_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                TIMESTAMPTZ
);

CREATE INDEX render_jobs_dream_id_idx ON render_jobs(dream_id);

-- ─── Community Posts ──────────────────────────────────────────────────────────
CREATE TABLE community_posts (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  share_id          TEXT NOT NULL UNIQUE REFERENCES dreams(share_id),
  dream_id          UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  anonymous_handle  TEXT NOT NULL,
  excerpt           TEXT NOT NULL,
  style             TEXT NOT NULL,
  emotions          TEXT[] NOT NULL DEFAULT '{}',
  symbols           TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url     TEXT,
  vibes             JSONB NOT NULL DEFAULT '{}', -- {"🌊": 12, "🔥": 5}
  comment_count     INT NOT NULL DEFAULT 0,
  is_reported       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX community_posts_created_at_idx ON community_posts(created_at DESC);

-- ─── Streak helper function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_dream_stats(p_user_id UUID)
RETURNS TABLE(
  total_dreams INT,
  streak_count INT,
  last_dream_date DATE,
  this_month_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT,
    (SELECT streak_count FROM profiles WHERE id = p_user_id),
    (SELECT last_dream_date FROM profiles WHERE id = p_user_id),
    COUNT(*) FILTER (
      WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
    )::INT
  FROM dreams
  WHERE user_id = p_user_id AND render_status = 'complete';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update their own only
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Dreams: users access their own only
CREATE POLICY "own dreams" ON dreams
  FOR ALL USING (auth.uid() = user_id);

-- Render jobs: own only
CREATE POLICY "own render jobs" ON render_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Community: lucid/oracle tiers can read; users insert their own
CREATE POLICY "community read" ON community_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tier IN ('lucid', 'oracle')
    )
  );

CREATE POLICY "community insert own" ON community_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dreams
      WHERE id = dream_id AND user_id = auth.uid()
    )
  );
