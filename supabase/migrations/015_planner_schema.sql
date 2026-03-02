-- ============================================================
-- Migration 015: Planner schema (Andaman Planner Pro)
-- Adds dedicated `planner` schema with profiles + itineraries.
-- Supabase Auth is the only identity source of truth.
-- ============================================================

-- UUID generation (preferred: gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep planner objects isolated from public schema
CREATE SCHEMA IF NOT EXISTS planner;

-- updated_at helper (schema-local to avoid name collisions)
CREATE OR REPLACE FUNCTION planner.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- planner.profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city text NULL,
  typical_budget_range text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON planner.profiles;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON planner.profiles
FOR EACH ROW
EXECUTE FUNCTION planner.set_updated_at();

ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Planner profiles: user can manage own row" ON planner.profiles;
CREATE POLICY "Planner profiles: user can manage own row"
ON planner.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- planner.itineraries
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  preferences jsonb NOT NULL,
  days jsonb NOT NULL,
  estimated_budget_range text NULL,
  islands_covered text[] NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_user_id ON planner.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_itineraries_created_at ON planner.itineraries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_itineraries_updated_at ON planner.itineraries(updated_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON planner.itineraries;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON planner.itineraries
FOR EACH ROW
EXECUTE FUNCTION planner.set_updated_at();

ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Planner itineraries: select own" ON planner.itineraries;
CREATE POLICY "Planner itineraries: select own"
ON planner.itineraries
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Planner itineraries: insert own" ON planner.itineraries;
CREATE POLICY "Planner itineraries: insert own"
ON planner.itineraries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Planner itineraries: update own" ON planner.itineraries;
CREATE POLICY "Planner itineraries: update own"
ON planner.itineraries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Planner itineraries: delete own" ON planner.itineraries;
CREATE POLICY "Planner itineraries: delete own"
ON planner.itineraries
FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- planner.generation_events (DB-backed per-user rate limit)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner.generation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planner_generation_events_user_time ON planner.generation_events(user_id, created_at DESC);

ALTER TABLE planner.generation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Planner generation events: select own" ON planner.generation_events;
CREATE POLICY "Planner generation events: select own"
ON planner.generation_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Planner generation events: insert own" ON planner.generation_events;
CREATE POLICY "Planner generation events: insert own"
ON planner.generation_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

