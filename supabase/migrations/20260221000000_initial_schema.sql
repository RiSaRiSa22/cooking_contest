-- ============================================================
-- Fornelli in Gara — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- competitions
CREATE TABLE competitions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  admin_pwd_hash  text NOT NULL,
  phase           text NOT NULL DEFAULT 'preparation'
                  CHECK (phase IN ('preparation', 'voting', 'finished')),
  allow_guests    boolean NOT NULL DEFAULT false,
  max_participants integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- participants
CREATE TABLE participants (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  nickname       text NOT NULL,
  pin_hash       text NOT NULL,
  role           text NOT NULL DEFAULT 'participant'
                 CHECK (role IN ('admin', 'participant')),
  joined_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, nickname)
);

-- dishes
CREATE TABLE dishes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  name           text NOT NULL,
  chef_name      text NOT NULL,
  ingredients    text,
  recipe         text,
  story          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- photos
CREATE TABLE photos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id    uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  url        text NOT NULL,
  is_extra   boolean NOT NULL DEFAULT false,
  "order"    integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- votes
CREATE TABLE votes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  dish_id        uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, participant_id)  -- one vote per participant per competition
);

-- login_attempts (rate limiting for PIN auth)
CREATE TABLE login_attempts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_code text NOT NULL,
  nickname         text NOT NULL,
  attempted_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_competitions_code        ON competitions(code);
CREATE INDEX idx_participants_competition  ON participants(competition_id);
CREATE INDEX idx_dishes_competition        ON dishes(competition_id);
CREATE INDEX idx_photos_dish               ON photos(dish_id);
CREATE INDEX idx_votes_competition         ON votes(competition_id);
CREATE INDEX idx_votes_dish                ON votes(dish_id);
CREATE INDEX idx_login_attempts_lookup     ON login_attempts(competition_code, nickname, attempted_at);

-- ============================================================
-- dishes_public VIEW
-- Hides chef_name and participant_id unless phase = 'finished'
-- security_invoker = true ensures RLS from underlying tables applies
-- ============================================================

CREATE VIEW dishes_public
WITH (security_invoker = true)
AS
  SELECT
    d.id,
    d.competition_id,
    d.name,
    d.ingredients,
    d.recipe,
    d.story,
    d.created_at,
    CASE WHEN c.phase = 'finished' THEN d.chef_name   ELSE NULL END AS chef_name,
    CASE WHEN c.phase = 'finished' THEN d.participant_id ELSE NULL END AS participant_id
  FROM dishes d
  JOIN competitions c ON c.id = d.competition_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE competitions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- competitions: anon can read (needed to look up competition by code)
CREATE POLICY "anon_read_competitions"
  ON competitions FOR SELECT
  USING (true);

-- participants: anon can read (needed for nickname conflict check)
CREATE POLICY "anon_read_participants"
  ON participants FOR SELECT
  USING (true);

-- dishes: anon can read (view with security_invoker handles column filtering)
-- Frontend must always query dishes_public view, never this table directly
CREATE POLICY "anon_read_dishes"
  ON dishes FOR SELECT
  USING (true);

-- photos: anon can read (photos are public within a competition)
CREATE POLICY "anon_read_photos"
  ON photos FOR SELECT
  USING (true);

-- votes: deny anon reads (only admin via service_role sees vote data)
-- No SELECT policy → default deny for anon

-- login_attempts: deny anon all operations (Edge Functions use service_role)
-- No policies → default deny for anon

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-photos', 'dish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage: allow public read for dish photos
CREATE POLICY "public_read_dish_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dish-photos');

-- Storage: allow authenticated uploads via service_role (Edge Functions handle uploads)
-- Anon direct upload is intentionally blocked; uploads go through Edge Function
