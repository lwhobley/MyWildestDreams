-- ============================================================
--  My Wildest Dreams — Canonical Supabase Schema
--  Fully idempotent: safe to re-run against any existing state
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Shared updated_at trigger function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',
             SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── Full-text search trigger function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_dream_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.title, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.description, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.interpretation, '')), 'C');
  RETURN NEW;
END;
$$;

-- ── Streak calculation ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_streak   INT  := 0;
  v_prev_day DATE := CURRENT_DATE;
  v_day      DATE;
BEGIN
  FOR v_day IN
    SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC')
    FROM   public.dreams
    WHERE  user_id = p_user_id
    ORDER  BY 1 DESC
  LOOP
    IF v_day = v_prev_day OR v_day = v_prev_day - INTERVAL '1 day' THEN
      v_streak   := v_streak + 1;
      v_prev_day := v_day;
    ELSE EXIT;
    END IF;
  END LOOP;
  RETURN v_streak;
END;
$$;

-- ── Symbol view upsert helper ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_symbol_view(p_user_id UUID, p_symbol_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.dream_symbol_views(user_id, symbol_id, view_count)
  VALUES (p_user_id, p_symbol_id, 1)
  ON CONFLICT (user_id, symbol_id) DO UPDATE
    SET view_count = dream_symbol_views.view_count + 1,
        viewed_at  = NOW();
END;
$$;


-- ============================================================
--  1. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT,
  email               TEXT,
  display_name        TEXT,
  avatar_url          TEXT,
  tier                TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free','lucid','oracle')),
  stripe_customer_id  TEXT,
  trial_ends_at       TIMESTAMPTZ,
  streak_count        INT         NOT NULL DEFAULT 0,
  last_dream_date     DATE,
  total_dreams        INT         NOT NULL DEFAULT 0,
  onboarding_done     BOOLEAN     NOT NULL DEFAULT FALSE,
  preferences         JSONB       NOT NULL DEFAULT '{
    "privacyMode": true,
    "autoCaption": true,
    "ambientSounds": false,
    "notifications": false,
    "notificationsEnabled": true,
    "morningReminderTime": "08:00",
    "voiceOnlyMode": false,
    "autoStyleSuggestion": true,
    "defaultStyle": "surreal",
    "highContrastMode": false
  }'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS on_auth_user_created        ON auth.users;
DROP TRIGGER IF EXISTS user_profiles_updated_at    ON public.user_profiles;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own profile"   ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users read own profile"   ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);


-- ============================================================
--  2. USER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id         UUID    PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  privacy_mode    BOOLEAN NOT NULL DEFAULT TRUE,
  auto_caption    BOOLEAN NOT NULL DEFAULT TRUE,
  ambient_sounds  BOOLEAN NOT NULL DEFAULT FALSE,
  notifications   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);


-- ============================================================
--  3. USER PUSH TOKENS  (Expo native push)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios','android','web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users manage own push tokens" ON public.user_push_tokens FOR ALL USING (auth.uid() = user_id);


-- ============================================================
--  4. WEB PUSH SUBSCRIPTIONS  (PWA / VAPID)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  endpoint    TEXT    NOT NULL,
  p256dh      TEXT    NOT NULL,
  auth        TEXT    NOT NULL,
  user_agent  TEXT,
  platform    TEXT    NOT NULL DEFAULT 'web' CHECK (platform IN ('web','ios','android')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_active
  ON public.push_subscriptions(user_id) WHERE is_active = TRUE;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);


-- ============================================================
--  5. NOTIFICATION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_log (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  error     TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_log_user_sent
  ON public.notification_log(user_id, sent_at DESC);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notification log" ON public.notification_log;
CREATE POLICY "Users read own notification log"
  ON public.notification_log FOR SELECT USING (auth.uid() = user_id);


-- ============================================================
--  6. DREAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dreams (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL DEFAULT '',
  description       TEXT        NOT NULL DEFAULT '',
  interpretation    TEXT        NOT NULL DEFAULT '',
  style_id          TEXT        NOT NULL DEFAULT 'surreal',
  mood_id           TEXT        NOT NULL DEFAULT 'mysterious',
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  analysis          JSONB,
  thumbnail_url     TEXT,
  thumbnail_index   SMALLINT    NOT NULL DEFAULT 1 CHECK (thumbnail_index BETWEEN 1 AND 4),
  audio_url         TEXT,
  duration          TEXT        NOT NULL DEFAULT '0:00',
  is_favorite       BOOLEAN     NOT NULL DEFAULT FALSE,
  input_mode        TEXT        CHECK (input_mode IN ('voice','text')) DEFAULT 'voice',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector     TSVECTOR
);

-- ── Ensure all dreams columns exist (safe if table was pre-existing) ──────────
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS title           TEXT        NOT NULL DEFAULT '';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS description     TEXT        NOT NULL DEFAULT '';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS interpretation  TEXT        NOT NULL DEFAULT '';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS style_id        TEXT        NOT NULL DEFAULT 'surreal';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS mood_id         TEXT        NOT NULL DEFAULT 'mysterious';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS tags            TEXT[]      NOT NULL DEFAULT '{}';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS analysis        JSONB;
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS thumbnail_url   TEXT;
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS thumbnail_index SMALLINT    NOT NULL DEFAULT 1;
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS audio_url       TEXT;
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS duration        TEXT        NOT NULL DEFAULT '0:00';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS is_favorite     BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS input_mode      TEXT        DEFAULT 'voice';
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.dreams ADD COLUMN IF NOT EXISTS search_vector   TSVECTOR;

-- Same safety net for user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username           TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS display_name       TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url         TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS tier               TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS streak_count       INT  NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_dream_date    DATE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_dreams       INT  NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_done    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferences        JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();


CREATE INDEX IF NOT EXISTS dreams_user_created  ON public.dreams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dreams_user_favorite ON public.dreams(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS dreams_user_style    ON public.dreams(user_id, style_id);
CREATE INDEX IF NOT EXISTS dreams_user_mood     ON public.dreams(user_id, mood_id);
CREATE INDEX IF NOT EXISTS dreams_tags_gin      ON public.dreams USING GIN(tags);
CREATE INDEX IF NOT EXISTS dreams_analysis_gin  ON public.dreams USING GIN(analysis jsonb_path_ops);
CREATE INDEX IF NOT EXISTS dreams_search_vector ON public.dreams USING GIN(search_vector);

DROP TRIGGER IF EXISTS dreams_search_vector_update ON public.dreams;
DROP TRIGGER IF EXISTS dreams_updated_at           ON public.dreams;

CREATE TRIGGER dreams_search_vector_update
  BEFORE INSERT OR UPDATE ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.update_dream_search_vector();

DROP TRIGGER IF EXISTS dreams_updated_at ON public.dreams;
CREATE TRIGGER dreams_updated_at
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own dreams"   ON public.dreams;
DROP POLICY IF EXISTS "Users insert own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users update own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users delete own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users read own dreams" ON public.dreams;
CREATE POLICY "Users read own dreams"   ON public.dreams FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own dreams" ON public.dreams;
CREATE POLICY "Users insert own dreams" ON public.dreams FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own dreams" ON public.dreams;
CREATE POLICY "Users update own dreams" ON public.dreams FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own dreams" ON public.dreams;
CREATE POLICY "Users delete own dreams" ON public.dreams FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
--  7. DREAM SYMBOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dream_symbols (
  id               TEXT PRIMARY KEY,
  symbol           TEXT NOT NULL,
  emoji            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN
                     ('nature','architecture','creatures','celestial','body','objects','figures','elements')),
  short_meaning    TEXT NOT NULL,
  full_meaning     TEXT NOT NULL,
  jungian_context  TEXT NOT NULL,
  related_symbols  TEXT[] NOT NULL DEFAULT '{}',
  common_contexts  TEXT[] NOT NULL DEFAULT '{}',
  affirmation      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dream_symbols_category ON public.dream_symbols(category);
CREATE INDEX IF NOT EXISTS dream_symbols_search ON public.dream_symbols USING GIN(
  TO_TSVECTOR('english', symbol || ' ' || short_meaning || ' ' || full_meaning)
);

ALTER TABLE public.dream_symbols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read symbols" ON public.dream_symbols;
DROP POLICY IF EXISTS "Service role manages symbols"     ON public.dream_symbols;
CREATE POLICY "Authenticated users read symbols"
  ON public.dream_symbols FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Service role manages symbols"
  ON public.dream_symbols FOR ALL TO service_role USING (TRUE);


-- ============================================================
--  8. DREAM SYMBOL VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dream_symbol_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  symbol_id   TEXT NOT NULL REFERENCES public.dream_symbols(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count  INT NOT NULL DEFAULT 1,
  UNIQUE (user_id, symbol_id)
);

CREATE INDEX IF NOT EXISTS dream_symbol_views_user
  ON public.dream_symbol_views(user_id, viewed_at DESC);

ALTER TABLE public.dream_symbol_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own symbol views" ON public.dream_symbol_views;
CREATE POLICY "Users manage own symbol views"
  ON public.dream_symbol_views FOR ALL USING (auth.uid() = user_id);


-- ============================================================
--  9. STORAGE — dream-audio (private)
-- ============================================================
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dream-audio', 'dream-audio', FALSE, 52428800,
        ARRAY['audio/m4a','audio/mp4','audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/aac'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own audio"              ON storage.objects;
DROP POLICY IF EXISTS "Users read own audio"                ON storage.objects;
DROP POLICY IF EXISTS "Users delete own audio"              ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to audio"   ON storage.objects;

DROP POLICY IF EXISTS "Users upload own audio" ON storage.objects;
CREATE POLICY "Users upload own audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dream-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own audio" ON storage.objects;
CREATE POLICY "Users read own audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dream-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own audio" ON storage.objects;
CREATE POLICY "Users delete own audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dream-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Service role full access to audio" ON storage.objects;
CREATE POLICY "Service role full access to audio"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'dream-audio');


-- ============================================================
--  10. STORAGE — dream-thumbnails (public read)
-- ============================================================
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dream-thumbnails', 'dream-thumbnails', TRUE, 5242880,
        ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role uploads thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public reads thumbnails"         ON storage.objects;
DROP POLICY IF EXISTS "Users delete own thumbnails"     ON storage.objects;

DROP POLICY IF EXISTS "Service role uploads thumbnails" ON storage.objects;
CREATE POLICY "Service role uploads thumbnails"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'dream-thumbnails');

DROP POLICY IF EXISTS "Public reads thumbnails" ON storage.objects;
CREATE POLICY "Public reads thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dream-thumbnails');

DROP POLICY IF EXISTS "Users delete own thumbnails" ON storage.objects;
CREATE POLICY "Users delete own thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dream-thumbnails'
    AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
--  11. VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.user_dream_stats AS
SELECT
  user_id,
  COUNT(*)                                          AS total_dreams,
  COUNT(*) FILTER (WHERE is_favorite)               AS favorite_count,
  COUNT(DISTINCT style_id)                          AS unique_styles,
  COUNT(DISTINCT DATE_TRUNC('day', created_at))     AS active_days,
  MAX(created_at)                                   AS last_dream_at,
  MODE() WITHIN GROUP (ORDER BY style_id)           AS top_style,
  MODE() WITHIN GROUP (ORDER BY mood_id)            AS top_mood
FROM public.dreams
GROUP BY user_id;


-- ============================================================
--  12. SYMBOL SEED
-- ============================================================
INSERT INTO public.dream_symbols
  (id, symbol, emoji, category, short_meaning, full_meaning,
   jungian_context, related_symbols, common_contexts, affirmation)
VALUES
('forest','Forest','🌲','nature','The unconscious mind; the unknown self',
 'The forest represents the vast, unmapped territory of the unconscious.',
 'Jung saw the forest as archetypal shadow domain.',
 ARRAY['trees','path','darkness','animals'],
 ARRAY['Wandering lost among ancient trees','A clearing appearing suddenly'],
 'The unknown within you holds gifts, not only dangers.'),
('ocean','Ocean','🌊','nature','The collective unconscious; emotional depth',
 'The ocean represents the collective unconscious in its grandest expression.',
 'For Jung, water symbolizes the unconscious. The ocean is its ultimate form.',
 ARRAY['water','waves','depth','fish','shore'],
 ARRAY['Standing at the shoreline unable to enter','Being submerged and breathing freely'],
 'Your emotional depths are not something to fear — they are your source.'),
('house','House','🏠','architecture','The self; the structure of the psyche',
 'The house is one of the most universal symbols of the self in dreams.',
 'Jung described the house as the most common symbol for the psyche as a whole.',
 ARRAY['rooms','doors','basement','attic','windows'],
 ARRAY['Discovering a hidden room','Childhood home appearing transformed'],
 'Every room inside you is yours to explore.'),
('door','Door','🚪','architecture','Threshold; transition and opportunity',
 'A door represents transition between one state of being and another.',
 'Doors mark psychic boundaries. An open door signals readiness for change.',
 ARRAY['key','hallway','light','threshold','lock'],
 ARRAY['A door at the end of a long corridor','Light streaming through a keyhole'],
 'The doors that won''t open are protecting you until you are ready.'),
('snake','Snake','🐍','creatures','Transformation; hidden wisdom or primal energy',
 'The snake embodies paradox: both healing and venom, wisdom and danger.',
 'Jung saw the snake as representing the autonomous psyche beyond ego control.',
 ARRAY['shedding','coil','eyes','poison','healing'],
 ARRAY['A snake shedding its skin in slow motion','Being bitten but feeling no fear'],
 'Transformation requires you to shed what no longer fits.'),
('bird','Bird','🕊️','creatures','Freedom; spirit; transcendence',
 'Birds represent the liberated spirit that transcends the material.',
 'Birds are associated with spiritual aspiration and the anima/animus.',
 ARRAY['sky','wings','nest','flight','song'],
 ARRAY['Flying alongside birds effortlessly','A single bird delivering a message'],
 'You were made to rise above what holds you down.'),
('moon','Moon','🌙','celestial','The unconscious; cycles; the feminine principle',
 'The moon governs the night realm — the domain of dream itself.',
 'The moon is strongly associated with the anima and cyclical unconscious wisdom.',
 ARRAY['water','tides','night','reflection','silver'],
 ARRAY['A moon impossibly large on the horizon','Bathing in moonlight'],
 'Even in darkness, you are giving off light.'),
('sun','Sun','☀️','celestial','Consciousness; vitality; the self in fullness',
 'The sun represents the principle of consciousness itself.',
 'In alchemy the sun is the Sol — the masculine principle of consciousness.',
 ARRAY['light','warmth','golden','sky','dawn'],
 ARRAY['The sun rising after a long darkness','A black sun or eclipse'],
 'Your light is not borrowed — it is your own.'),
('fire','Fire','🔥','elements','Transformation; passion; purification',
 'Fire is the great transformer — it destroys to create, consumes to purify.',
 'In alchemical terms, fire is the agent of transformation.',
 ARRAY['ash','light','warmth','destruction','rebirth'],
 ARRAY['A controlled flame in the palm of your hand','Standing in fire without being burned'],
 'What is burning away is making room for what you are becoming.'),
('water','Water','💧','elements','The unconscious; emotion; flow and change',
 'Water is the most universal symbol of the unconscious in all its forms.',
 'For Jung, water is the most frequent symbol of the unconscious.',
 ARRAY['river','rain','flood','reflection','thirst'],
 ARRAY['Water rising slowly around you','A mirror-smooth lake that shows another world'],
 'Let the waters of feeling move through you without fear.'),
('mirror','Mirror','🪞','objects','Self-reflection; the shadow; alternate selves',
 'The mirror presents the self back to the self — but rarely shows only what is expected.',
 'The mirror is a powerful symbol of the shadow encounter.',
 ARRAY['reflection','shadow','face','glass','twin'],
 ARRAY['Your reflection moves independently','A mirror showing a different version of you'],
 'What the mirror shows is part of you — and it is asking to be known.'),
('key','Key','🗝️','objects','Access; solution; hidden knowledge unlocked',
 'A key represents the means of access to something previously closed.',
 'Keys appear when the dreamer is on the verge of accessing unconscious material.',
 ARRAY['lock','door','chest','secret','gold'],
 ARRAY['A key that fits no lock you can find','A golden key given by a stranger'],
 'You already carry the key — you are learning which door it opens.'),
('shadow-figure','Shadow Figure','👤','figures','The shadow; the unintegrated self',
 'A shadowy figure is one of the most direct manifestations of the Jungian Shadow.',
 'Jung considered the encounter with the Shadow the first task of individuation.',
 ARRAY['darkness','pursuit','unknown','mirror','mask'],
 ARRAY['Being followed by a shadowy figure','Merging with the shadow figure'],
 'The figure that follows you is the part of you asking to come home.'),
('wise-elder','Wise Elder','🧙','figures','Inner wisdom; the Self; guidance from depth',
 'An elder or sage represents the wisdom of the deep unconscious.',
 'Jung identified the Wise Old Man as a primary archetype of the collective unconscious.',
 ARRAY['staff','lantern','book','cave','robes'],
 ARRAY['An elder appearing at a crossroads','Receiving a gift or message from a sage'],
 'The wisdom you seek is already inside you.')
ON CONFLICT (id) DO UPDATE SET
  symbol          = EXCLUDED.symbol,
  emoji           = EXCLUDED.emoji,
  short_meaning   = EXCLUDED.short_meaning,
  full_meaning    = EXCLUDED.full_meaning,
  jungian_context = EXCLUDED.jungian_context,
  related_symbols = EXCLUDED.related_symbols,
  common_contexts = EXCLUDED.common_contexts,
  affirmation     = EXCLUDED.affirmation;

-- ============================================================
-- Done.
-- ============================================================
