-- ============================================================
-- Migration 015: Andaman Planner Pro schema + RLS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS planner;

-- Keep updated_at in sync for planner tables.
CREATE OR REPLACE FUNCTION planner.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS planner.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city text NULL,
  typical_budget_range text NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

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
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT itineraries_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_user_id
  ON planner.itineraries(user_id);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_created_at
  ON planner.itineraries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_date_range
  ON planner.itineraries(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_planner_itineraries_islands_gin
  ON planner.itineraries USING gin (islands_covered);

DROP TRIGGER IF EXISTS set_updated_at_on_planner_profiles ON planner.profiles;
CREATE TRIGGER set_updated_at_on_planner_profiles
  BEFORE UPDATE ON planner.profiles
  FOR EACH ROW
  EXECUTE FUNCTION planner.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_on_planner_itineraries ON planner.itineraries;
CREATE TRIGGER set_updated_at_on_planner_itineraries
  BEFORE UPDATE ON planner.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION planner.set_updated_at();

ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: user can select own row" ON planner.profiles;
CREATE POLICY "Profiles: user can select own row"
  ON planner.profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: user can insert own row" ON planner.profiles;
CREATE POLICY "Profiles: user can insert own row"
  ON planner.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: user can update own row" ON planner.profiles;
CREATE POLICY "Profiles: user can update own row"
  ON planner.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: user can delete own row" ON planner.profiles;
CREATE POLICY "Profiles: user can delete own row"
  ON planner.profiles
  FOR DELETE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Itineraries: user can select own rows" ON planner.itineraries;
CREATE POLICY "Itineraries: user can select own rows"
  ON planner.itineraries
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Itineraries: user can insert own rows" ON planner.itineraries;
CREATE POLICY "Itineraries: user can insert own rows"
  ON planner.itineraries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Itineraries: user can update own rows" ON planner.itineraries;
CREATE POLICY "Itineraries: user can update own rows"
  ON planner.itineraries
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Itineraries: user can delete own rows" ON planner.itineraries;
CREATE POLICY "Itineraries: user can delete own rows"
  ON planner.itineraries
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role support for server-side admin flows.
DROP POLICY IF EXISTS "Profiles: service role full access" ON planner.profiles;
CREATE POLICY "Profiles: service role full access"
  ON planner.profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Itineraries: service role full access" ON planner.itineraries;
CREATE POLICY "Itineraries: service role full access"
  ON planner.itineraries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT USAGE ON SCHEMA planner TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA planner TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA planner
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
