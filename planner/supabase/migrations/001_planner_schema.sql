-- =============================================================
-- Migration 001: planner schema — tables + indexes
-- Runs inside the shared AndamanBazaar Supabase project.
-- Uses dedicated "planner" schema to avoid collisions with
-- existing public.profiles, public.listings, etc.
-- =============================================================

-- Create the planner schema
CREATE SCHEMA IF NOT EXISTS planner;

-- =============================================================
-- Table: planner.profiles
-- One row per authenticated user (created on first planner use).
-- References auth.users so it is tied to Supabase Auth.
-- =============================================================
CREATE TABLE IF NOT EXISTS planner.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_city     TEXT,
  typical_budget_range TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE planner.profiles IS
  'Per-user planner preferences; one row per auth.users id.';

-- =============================================================
-- Table: planner.rate_limits
-- Tracks AI generation calls per user for hourly rate limiting
-- without requiring Redis.
-- =============================================================
CREATE TABLE IF NOT EXISTS planner.rate_limits (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL DEFAULT 'generate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_user_action_created
  ON planner.rate_limits (user_id, action, created_at DESC);

-- =============================================================
-- Table: planner.itineraries
-- Stores every AI-generated trip plan.
-- preferences + days stored as JSONB snapshots.
-- =============================================================
CREATE TABLE IF NOT EXISTS planner.itineraries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  start_date            DATE        NOT NULL,
  end_date              DATE        NOT NULL,
  preferences           JSONB       NOT NULL,
  days                  JSONB       NOT NULL,
  islands_covered       TEXT[]      NOT NULL DEFAULT '{}',
  estimated_budget_range TEXT,
  model_version         TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE planner.itineraries IS
  'AI-generated Andaman trip itineraries; owned by user_id.';
COMMENT ON COLUMN planner.itineraries.preferences IS
  'Snapshot of TripPreferences used to generate this itinerary.';
COMMENT ON COLUMN planner.itineraries.days IS
  'Array of ItineraryDay objects produced by the AI model.';

CREATE INDEX IF NOT EXISTS itineraries_user_id_created
  ON planner.itineraries (user_id, created_at DESC);

-- =============================================================
-- Trigger: auto-update updated_at on planner.itineraries
-- =============================================================
CREATE OR REPLACE FUNCTION planner.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON planner.itineraries
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON planner.profiles
  FOR EACH ROW EXECUTE FUNCTION planner.set_updated_at();
