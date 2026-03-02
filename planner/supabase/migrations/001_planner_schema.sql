-- Andaman Planner Pro — Schema & RLS
-- Migration: 001_planner_schema
-- This migration creates a dedicated "planner" schema to avoid name collisions
-- with existing AndamanBazaar marketplace tables in the public schema.

-- 1. Create dedicated schema
CREATE SCHEMA IF NOT EXISTS planner;

-- 2. planner.profiles
CREATE TABLE planner.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city     text        NULL,
  typical_budget_range text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE planner.profiles IS 'Per-user planner preferences/profile';

-- 3. planner.itineraries
CREATE TABLE planner.itineraries (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   text        NOT NULL,
  start_date             date        NOT NULL,
  end_date               date        NOT NULL,
  preferences            jsonb       NOT NULL,
  days                   jsonb       NOT NULL,
  estimated_budget_range text        NULL,
  islands_covered        text[]      NULL,
  model_version          text        NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE planner.itineraries IS 'AI-generated trip itineraries';

CREATE INDEX idx_itineraries_user_id ON planner.itineraries(user_id);
CREATE INDEX idx_itineraries_created_at ON planner.itineraries(created_at DESC);

-- 4. planner.rate_limits (for per-user generation throttling)
CREATE TABLE planner.rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text        NOT NULL DEFAULT 'generate',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_user_action ON planner.rate_limits(user_id, action, created_at DESC);

-- 5. Updated-at trigger function (reusable)
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

-- 6. Enable RLS on all planner tables
ALTER TABLE planner.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner.rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies — profiles (own row only via id = auth.uid())
CREATE POLICY profiles_select ON planner.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_insert ON planner.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON planner.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete ON planner.profiles
  FOR DELETE USING (id = auth.uid());

-- 8. RLS policies — itineraries (own rows only via user_id = auth.uid())
CREATE POLICY itineraries_select ON planner.itineraries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY itineraries_insert ON planner.itineraries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY itineraries_update ON planner.itineraries
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY itineraries_delete ON planner.itineraries
  FOR DELETE USING (user_id = auth.uid());

-- 9. RLS policies — rate_limits (own rows only)
CREATE POLICY rate_limits_select ON planner.rate_limits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY rate_limits_insert ON planner.rate_limits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 10. Grant usage on planner schema to authenticated role
GRANT USAGE ON SCHEMA planner TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA planner TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA planner TO authenticated;
