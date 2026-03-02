-- Andaman Planner Pro — Schema Migration 001
-- Creates the `planner` schema with tables and RLS policies.
-- Safe to run alongside existing AndamanBazaar public-schema tables.

BEGIN;

-- ─── Schema ────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS planner;

-- ─── planner.profiles ──────────────────────────────────────────────────────
CREATE TABLE planner.profiles (
  id                    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city             text,
  typical_budget_range  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON planner.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON planner.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON planner.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON planner.profiles FOR DELETE
  USING (id = auth.uid());

-- ─── planner.itineraries ───────────────────────────────────────────────────
CREATE TABLE planner.itineraries (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  start_date              date        NOT NULL,
  end_date                date        NOT NULL,
  preferences             jsonb       NOT NULL,
  days                    jsonb       NOT NULL,
  estimated_budget_range  text,
  islands_covered         text[],
  model_version           text        NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itineraries"
  ON planner.itineraries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own itineraries"
  ON planner.itineraries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own itineraries"
  ON planner.itineraries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own itineraries"
  ON planner.itineraries FOR DELETE
  USING (user_id = auth.uid());

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_itineraries_user_id ON planner.itineraries (user_id);
CREATE INDEX idx_itineraries_created_at ON planner.itineraries (created_at DESC);

-- ─── updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION planner.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON planner.profiles
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();

CREATE TRIGGER trg_itineraries_updated_at
  BEFORE UPDATE ON planner.itineraries
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();

-- ─── Rate-limit tracking ──────────────────────────────────────────────────
CREATE TABLE planner.generation_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planner.generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation log"
  ON planner.generation_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generation log"
  ON planner.generation_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_generation_log_user_time
  ON planner.generation_log (user_id, created_at DESC);

-- ─── Grant usage to authenticated role ────────────────────────────────────
GRANT USAGE ON SCHEMA planner TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA planner TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA planner TO authenticated;

COMMIT;
