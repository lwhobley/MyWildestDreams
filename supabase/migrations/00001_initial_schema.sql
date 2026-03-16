-- ============================================================
--  My Wildest Dreams — Supabase Schema
--  Migration: 00001_initial_schema
-- ============================================================
--  Run this in the Supabase SQL editor on your new project.
--  Order matters — run top to bottom as a single transaction.
-- ============================================================


-- ── Extensions ────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- for fast tag/text search


-- ============================================================
--  1. USER PROFILES
--     One row per auth.users entry.
--     Created automatically via trigger on signup.
-- ============================================================

create table if not exists public.user_profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text,
  email            text,
  onboarding_done  boolean   not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.user_profiles is
  'Extended profile for every authenticated user.';

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);


-- ============================================================
--  2. USER SETTINGS
--     One row per user, upserted from the app.
-- ============================================================

create table if not exists public.user_settings (
  user_id         uuid primary key references public.user_profiles (id) on delete cascade,
  privacy_mode    boolean not null default true,
  auto_caption    boolean not null default true,
  ambient_sounds  boolean not null default false,
  notifications   boolean not null default false,
  updated_at      timestamptz not null default now()
);

comment on table public.user_settings is
  'Per-user app preferences, synced from device.';

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);


-- ============================================================
--  3. USER PUSH TOKENS
--     Stores Expo push tokens for server-triggered notifications.
--     Multiple rows allowed (one per device).
-- ============================================================

create table if not exists public.user_push_tokens (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.user_profiles (id) on delete cascade,
  token       text not null,
  platform    text check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  unique (user_id, token)
);

comment on table public.user_push_tokens is
  'Expo push tokens for remote notification delivery.';

alter table public.user_push_tokens enable row level security;

create policy "Users can manage own push tokens"
  on public.user_push_tokens for all
  using (auth.uid() = user_id);


-- ============================================================
--  4. DREAMS
--     Core table. Mirrors the Dream + DreamAnalysis interfaces.
--     analysis stored as JSONB — flexible, queryable.
-- ============================================================

create table if not exists public.dreams (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.user_profiles (id) on delete cascade,

  -- Core dream fields
  title             text        not null,
  description       text        not null,
  style_id          text        not null,   -- surreal | cyberpunk | watercolor | noir | cosmic | gothic
  mood_id           text        not null,   -- peaceful | anxious | joyful | mysterious | melancholic | euphoric | terrifying | surreal
  tags              text[]      not null default '{}',
  interpretation    text        not null default '',
  is_favorite       boolean     not null default false,
  duration          text        not null default '0:00',

  -- Thumbnail: AI-generated URL takes priority; index is fallback (1-4)
  thumbnail_url     text,
  thumbnail_index   smallint    not null default 1 check (thumbnail_index between 1 and 4),

  -- Full Jungian analysis blob — matches DreamAnalysis interface
  analysis          jsonb,
  -- Shape reference (not enforced by DB, enforced by app):
  -- {
  --   emotionalTone: { primary, secondary, intensity },
  --   keySymbols:    [{ symbol, meaning }],
  --   narrativeArc:  { stage, summary },
  --   jungianArchetypes: [{ archetype, manifestation }],
  --   shadowElements: string,
  -- }

  -- Input method tracking
  input_mode        text        check (input_mode in ('voice', 'text')) default 'voice',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.dreams is
  'Every dream a user captures, with AI analysis stored as JSONB.';

-- Indexes for common query patterns
create index dreams_user_id_created_at  on public.dreams (user_id, created_at desc);
create index dreams_user_id_favorite    on public.dreams (user_id, is_favorite) where is_favorite = true;
create index dreams_user_id_style       on public.dreams (user_id, style_id);
create index dreams_user_id_mood        on public.dreams (user_id, mood_id);
create index dreams_tags_gin            on public.dreams using gin (tags);
create index dreams_analysis_gin        on public.dreams using gin (analysis jsonb_path_ops);

create trigger dreams_updated_at
  before update on public.dreams
  for each row execute procedure public.set_updated_at();

alter table public.dreams enable row level security;

create policy "Users can read own dreams"
  on public.dreams for select
  using (auth.uid() = user_id);

create policy "Users can insert own dreams"
  on public.dreams for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dreams"
  on public.dreams for update
  using (auth.uid() = user_id);

create policy "Users can delete own dreams"
  on public.dreams for delete
  using (auth.uid() = user_id);


-- ============================================================
--  5. DREAM SYMBOLS  (Encyclopedia)
--     Seeded from constants/symbols.ts — managed by admins,
--     readable by all authenticated users.
-- ============================================================

create table if not exists public.dream_symbols (
  id                  text        primary key,   -- matches SymbolEntry.id e.g. 'forest'
  symbol              text        not null,
  emoji               text        not null,
  category            text        not null,      -- nature | architecture | creatures | celestial | body | objects | figures | elements
  short_meaning       text        not null,
  full_meaning        text        not null,
  jungian_context     text        not null,
  related_symbols     text[]      not null default '{}',
  common_contexts     text[]      not null default '{}',
  affirmation         text        not null,
  created_at          timestamptz not null default now()
);

comment on table public.dream_symbols is
  'Symbol encyclopedia entries — seeded from the app constants, admin-managed.';

create index dream_symbols_category on public.dream_symbols (category);
create index dream_symbols_search   on public.dream_symbols using gin (
  to_tsvector('english', symbol || ' ' || short_meaning || ' ' || full_meaning)
);

alter table public.dream_symbols enable row level security;

create policy "Authenticated users can read symbols"
  on public.dream_symbols for select
  to authenticated
  using (true);

-- Allow service role to seed/update symbols
create policy "Service role can manage symbols"
  on public.dream_symbols for all
  to service_role
  using (true);


-- ============================================================
--  6. DREAM SYMBOL VIEWS
--     Tracks which symbols each user has explored — useful for
--     personalised recommendations and analytics later.
-- ============================================================

create table if not exists public.dream_symbol_views (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references public.user_profiles (id) on delete cascade,
  symbol_id   text        not null references public.dream_symbols (id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  view_count  integer     not null default 1,
  unique (user_id, symbol_id)
);

comment on table public.dream_symbol_views is
  'Tracks symbol encyclopedia views per user for personalisation.';

create index dream_symbol_views_user on public.dream_symbol_views (user_id, viewed_at desc);

alter table public.dream_symbol_views enable row level security;

create policy "Users can manage own symbol views"
  on public.dream_symbol_views for all
  using (auth.uid() = user_id);

-- Upsert helper: increments view_count if row exists
create or replace function public.upsert_symbol_view(
  p_user_id   uuid,
  p_symbol_id text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.dream_symbol_views (user_id, symbol_id, view_count)
  values (p_user_id, p_symbol_id, 1)
  on conflict (user_id, symbol_id) do update
    set view_count = dream_symbol_views.view_count + 1,
        viewed_at  = now();
end;
$$;


-- ============================================================
--  7. STORAGE BUCKET — dream-thumbnails
--     AI-generated dream images live here.
--     Public read; authenticated write (via service role in edge fn).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dream-thumbnails',
  'dream-thumbnails',
  true,
  5242880,   -- 5 MB per image
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Allow edge functions (service role) to upload
create policy "Service role can upload dream thumbnails"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'dream-thumbnails');

-- Allow public read
create policy "Public can read dream thumbnails"
  on storage.objects for select
  using (bucket_id = 'dream-thumbnails');

-- Allow authenticated users to delete their own (optional)
create policy "Users can delete own dream thumbnails"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'dream-thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
--  8. USEFUL VIEWS
-- ============================================================

-- Dream stats per user — used by Profile screen
create or replace view public.user_dream_stats as
select
  user_id,
  count(*)                                              as total_dreams,
  count(*) filter (where is_favorite)                   as favorite_count,
  count(distinct style_id)                              as unique_styles,
  count(distinct date_trunc('day', created_at))         as active_days,
  max(created_at)                                       as last_dream_at,
  mode() within group (order by style_id)               as top_style,
  mode() within group (order by mood_id)                as top_mood
from public.dreams
group by user_id;

comment on view public.user_dream_stats is
  'Aggregated dream statistics per user for the Profile screen.';


-- Most-viewed symbols per user
create or replace view public.user_top_symbols as
select
  v.user_id,
  v.symbol_id,
  s.symbol,
  s.emoji,
  s.category,
  v.view_count,
  v.viewed_at
from public.dream_symbol_views v
join public.dream_symbols s on s.id = v.symbol_id
order by v.user_id, v.view_count desc;


-- ============================================================
--  9. SEED — Dream Symbols
--     Matches constants/symbols.ts exactly.
-- ============================================================

insert into public.dream_symbols
  (id, symbol, emoji, category, short_meaning, full_meaning, jungian_context, related_symbols, common_contexts, affirmation)
values
  ('forest','Forest','🌲','nature','The unconscious mind; the unknown self','The forest represents the vast, unmapped territory of the unconscious. To enter a forest in a dream is to venture inward — away from the structured world of the ego and into the primordial, instinctive depths of the psyche.','Jung saw the forest as an archetypal symbol of the unconscious, where the instincts dwell. It is the domain of the Shadow — the parts of ourselves we have yet to integrate. Getting lost in a forest often signals that the dreamer is losing touch with their conscious identity and being pulled into deeper layers of the self.',array['trees','path','darkness','animals'],array['Wandering lost among ancient trees','A clearing appearing suddenly','Being followed through dark woods','Finding a hidden cabin'],'The unknown within you holds gifts, not only dangers.'),
  ('ocean','Ocean','🌊','nature','The collective unconscious; emotional depth','The ocean is one of the most powerful dream symbols, representing the collective unconscious — the vast reservoir of shared human experience and archetypal energy. Its depth reflects the unfathomable dimensions of the psyche.','For Jung, water in all forms symbolizes the unconscious. The ocean is its grandest expression — infinite, powerful, and full of hidden life. Calm seas suggest emotional equilibrium; stormy seas, psychic turbulence.',array['water','waves','depth','fish','shore'],array['Standing at the shoreline unable to enter','Being submerged and breathing freely','A vast calm sea at night','A wave approaching on the horizon'],'Your emotional depths are not something to fear — they are your source.'),
  ('garden','Garden','🌹','nature','Cultivated self; growth and tended potential','The garden represents the self as something cultivated and tended — the aspects of personality that have been consciously developed and nurtured over time.','A walled garden often appears as a symbol of the enclosed, protected self — the temenos, or sacred precinct. What blooms in the garden reflects what you have nurtured in yourself.',array['flowers','walls','fountain','seasons'],array['A secret garden behind a locked gate','Flowers growing in impossible colors','Tending plants that grow rapidly','A garden changing with the seasons'],'Everything you have planted within yourself is still growing.'),
  ('mountain','Mountain','⛰️','nature','Aspiration; the path of individuation','Mountains represent the great challenges and aspirations of the psyche — the arduous, necessary journey toward higher consciousness and wholeness.','In Jungian terms, climbing a mountain often represents the process of individuation — the lifelong journey of becoming who one truly is.',array['peak','path','clouds','snow','valley'],array['An impossible summit that keeps receding','Climbing effortlessly with great joy','Looking down from a peak at the world','A mountain appearing where none existed'],'The climb itself is transforming you.'),
  ('house','House','🏠','architecture','The self; the structure of the psyche','The house is one of the most universal symbols of the self in dreams. Each room represents a different aspect of the psyche — attics hold memories, basements the unconscious and shadow material.','Jung described the house as the most common symbol for the psyche as a whole. Exploring an unknown room in your house signals the discovery of previously unconscious aspects of yourself.',array['rooms','doors','basement','attic','windows'],array['Discovering a hidden room','Childhood home appearing transformed','A house that is larger inside than outside','Navigating dark hallways'],'Every room inside you is yours to explore.'),
  ('door','Door','🚪','architecture','Threshold; transition and opportunity','A door represents transition — the passage between one state of being and another. It is both an invitation and a challenge.','In Jungian symbolism, doors mark psychic boundaries. An open door signals readiness for change. A locked door suggests a part of the self not yet accessible.',array['key','hallway','light','threshold','lock'],array['A door at the end of a long corridor','Unable to open a door despite trying','A door appearing in a wall with no door','Light streaming through a keyhole'],'The doors that won''t open are protecting you until you are ready.'),
  ('tower','Tower','🗼','architecture','Isolation; elevated perspective or ego','The tower symbolizes both lofty aspiration and isolation. It can represent the intellect elevated above the emotional life.','Jung himself built a stone tower at Bollingen as a symbol of his inner self. A tower may represent the persona or the isolated ego cut off from warmth and the unconscious.',array['height','spiral staircase','window','stone','isolation'],array['Looking out from a tower over a vast landscape','Trapped in a tower unable to descend','A spiral staircase that never ends','Building a tower stone by stone'],'True elevation comes from depth, not height.'),
  ('bridge','Bridge','🌉','architecture','Connection; crossing between two states','The bridge is a symbol of passage — the act of moving from one psychological state to another across a divide.','Bridges in dreams often appear at moments of major life transition — crossing from one identity to another, integrating opposing aspects of the psyche.',array['water','crossing','two sides','abyss'],array['A rickety bridge over a chasm','Crossing a beautiful bridge at night','A bridge that disappears behind you','Standing at the midpoint between two worlds'],'You already have everything needed to cross.'),
  ('snake','Snake','🐍','creatures','Transformation; hidden wisdom or primal energy','The snake is one of the oldest and most complex dream symbols, embodying paradox: it is both healing and venom, wisdom and danger.','Jung saw the snake as representing the autonomous psyche — the part of the unconscious that operates beyond ego control. It often appears when a profound transformation is underway.',array['shedding','coil','eyes','poison','healing'],array['A snake shedding its skin in slow motion','Being bitten but feeling no fear','A snake guarding something precious','Holding a snake that becomes calm'],'Transformation requires you to shed what no longer fits.'),
  ('bird','Bird','🕊️','creatures','Freedom; spirit; transcendence','Birds represent the liberated spirit — the aspect of consciousness that transcends the material and soars beyond the earthbound.','In Jungian psychology, birds are often associated with spiritual aspiration and the anima or animus — the inner feminine or masculine that mediates between ego and the deeper self.',array['sky','wings','nest','flight','song'],array['Flying alongside birds effortlessly','A single bird delivering a message','A wounded bird that needs care','Birds speaking in a language you understand'],'You were made to rise above what holds you down.'),
  ('wolf','Wolf','🐺','creatures','Instinct; the wild self; pack and solitude','The wolf embodies raw instinct, feral intelligence, and the tension between solitude and belonging.','The wolf often represents shadow material — the repressed, instinctive aspects of the self that have been banished from the persona.',array['pack','moon','howl','forest','chase'],array['Running with a pack through dark woods','A lone wolf watching from a distance','Being chased but unafraid','A wolf that becomes a guide'],'Your wildness is not your weakness — it is your power.'),
  ('moon','Moon','🌙','celestial','The unconscious; cycles; the feminine principle','The moon governs the night realm — the domain of dream itself. It symbolizes the rhythmic, cyclical nature of the psyche.','The moon is strongly associated with the anima — the feminine soul-image in the male psyche — and with the instinctive, cyclical wisdom of the unconscious.',array['water','tides','night','reflection','silver'],array['A moon impossibly large on the horizon','Two moons in the sky','Bathing in moonlight','The moon speaking or descending'],'Even in darkness, you are giving off light.'),
  ('sun','Sun','☀️','celestial','Consciousness; vitality; the self in fullness','The sun represents the principle of consciousness itself — clarity, life-force, and the radiant wholeness of the fully realized self.','In alchemy, which Jung studied extensively, the sun is the Sol — the masculine principle of consciousness, clarity, and spirit.',array['light','warmth','golden','sky','dawn'],array['The sun rising after a long darkness','Standing at the center of a solar landscape','A black sun or eclipse','The sun and moon together in the sky'],'Your light is not borrowed — it is your own.'),
  ('stars','Stars','⭐','celestial','Guidance; destiny; points of connection in the vast','Stars in dreams represent fixed points of meaning in the vast unknown — guiding lights that orient the dreamer across the dark expanse of the unconscious.','Stars are often associated with the Self in its most transpersonal dimension — the organizing center that transcends the individual ego.',array['sky','navigation','night','infinity','constellation'],array['Stars falling or moving','A new star appearing just for you','Traveling between stars','Reading a map written in constellations'],'You are not lost — you are navigating.'),
  ('fire','Fire','🔥','elements','Transformation; passion; purification','Fire is the great transformer — it destroys to create, consumes to purify, and illuminates the darkness.','In alchemical terms, fire is the agent of transformation — the calcinatio that reduces the prima materia to ash before something new can arise.',array['ash','light','warmth','destruction','rebirth'],array['A controlled flame in the palm of your hand','A fire that spreads but doesn''t consume','Standing in fire without being burned','Fire burning away what is old and heavy'],'What is burning away is making room for what you are becoming.'),
  ('water','Water','💧','elements','The unconscious; emotion; flow and change','Water is perhaps the most universal symbol of the unconscious in all its forms — from the still reflecting pool to the raging flood.','For Jung, water is the most frequent symbol of the unconscious. Clear water suggests clarity and insight; murky water, confusion or unexamined material.',array['river','rain','flood','reflection','thirst'],array['Water rising slowly around you','A river you must cross','Rain that feels like healing','A mirror-smooth lake that shows another world'],'Let the waters of feeling move through you without fear.'),
  ('wind','Wind','💨','elements','Spirit; invisible forces; change in motion','Wind is the breath of the world — invisible, powerful, and impossible to grasp.','In Greek, pneuma means both wind and spirit. Wind in dreams often symbolizes the activity of the unconscious — forces at work that cannot be seen but only felt in their effects.',array['breath','spirit','invisible','direction','change'],array['Wind carrying a voice or message','Becoming wind itself','Being lifted by wind without fear','Wind that stops all sound'],'You cannot see what is moving you, but you can trust the direction.'),
  ('key','Key','🗝️','objects','Access; solution; hidden knowledge unlocked','A key represents the means of access to something previously closed — a door, a chest, a truth, an aspect of the self.','Keys appear in dreams when the dreamer is on the verge of accessing unconscious material that has been locked away.',array['lock','door','chest','secret','gold'],array['A key that fits no lock you can find','Many keys and one right lock','A golden key given by a stranger','Losing the key just before opening something'],'You already carry the key — you are learning which door it opens.'),
  ('mirror','Mirror','🪞','objects','Self-reflection; the shadow; alternate selves','The mirror presents the self back to the self — but in dreams, it rarely shows only what is expected.','The mirror is a powerful symbol of the shadow encounter — the meeting with the unrecognized or denied aspects of the self.',array['reflection','shadow','face','glass','twin'],array['Your reflection moves independently','A mirror showing a different version of you','Unable to see yourself in the mirror','A mirror that shows only darkness'],'What the mirror shows is part of you — and it is asking to be known.'),
  ('hands','Hands','🤲','body','Agency; creation; connection and giving','Hands in dreams represent the capacity to act, create, reach out, and make.','Hands in Jungian psychology often relate to the opus — the great work of self-creation and transformation.',array['fingers','touch','work','offering','grasp'],array['Hands producing light or healing','Hands reaching through a threshold','Examining your own hands in wonder','An unknown pair of hands guiding you'],'Your hands are capable of things you have not yet imagined.'),
  ('eyes','Eyes','👁️','body','Perception; inner sight; being seen','Eyes in dreams represent perception, consciousness, and the capacity to truly see — both outward and inward.','The eye is the organ of insight — in dreams it often signals a new capacity for perception arising in the psyche.',array['sight','light','third eye','watching','tears'],array['An eye opening in an unexpected place','Eyes in the darkness watching without threat','Your own eyes a different color','Seeing with absolute clarity for the first time'],'You are beginning to see what was always there.'),
  ('shadow-figure','Shadow Figure','👤','figures','The shadow; the unintegrated self','A shadowy, faceless, or darkened human figure is one of the most direct manifestations of the Jungian Shadow.','Jung considered the encounter with the Shadow to be the first great task of individuation. The shadow figure carries qualities we have disowned — not only darkness, but also unlived light.',array['darkness','pursuit','unknown','mirror','mask'],array['Being followed by a shadowy figure','A silhouette that won''t show its face','The shadow figure becoming still and offering something','Merging with the shadow figure'],'The figure that follows you is the part of you asking to come home.'),
  ('wise-elder','Wise Elder','🧙','figures','Inner wisdom; the Self; guidance from depth','An elder, sage, teacher, or mysterious old figure represents the wisdom of the deep unconscious.','Jung identified the Wise Old Man as one of the primary archetypes of the collective unconscious, embodying the Logos — the ordering principle of meaning.',array['staff','lantern','book','cave','robes'],array['An elder appearing at a crossroads','Receiving a gift or message from a sage','A figure who answers questions with questions','Being led somewhere by an ancient being'],'The wisdom you seek is already inside you.')
on conflict (id) do update set
  symbol          = excluded.symbol,
  emoji           = excluded.emoji,
  short_meaning   = excluded.short_meaning,
  full_meaning    = excluded.full_meaning,
  jungian_context = excluded.jungian_context,
  related_symbols = excluded.related_symbols,
  common_contexts = excluded.common_contexts,
  affirmation     = excluded.affirmation;


-- ============================================================
-- Done.
-- ============================================================
