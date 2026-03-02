-- =============================================================
-- Migration 002: planner schema — Row Level Security policies
-- All planner tables are private; users can only access their
-- own rows (user_id = auth.uid() or id = auth.uid()).
-- =============================================================

-- ---- planner.profiles ----------------------------------------
ALTER TABLE planner.profiles ENABLE ROW LEVEL SECURITY;

-- Users may read their own profile row
CREATE POLICY "profiles: select own"
  ON planner.profiles FOR SELECT
  USING (id = auth.uid());

-- Users may insert only their own profile row
CREATE POLICY "profiles: insert own"
  ON planner.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users may update only their own profile row
CREATE POLICY "profiles: update own"
  ON planner.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users may delete their own profile row (GDPR convenience)
CREATE POLICY "profiles: delete own"
  ON planner.profiles FOR DELETE
  USING (id = auth.uid());


-- ---- planner.itineraries -------------------------------------
ALTER TABLE planner.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itineraries: select own"
  ON planner.itineraries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "itineraries: insert own"
  ON planner.itineraries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "itineraries: update own"
  ON planner.itineraries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "itineraries: delete own"
  ON planner.itineraries FOR DELETE
  USING (user_id = auth.uid());


-- ---- planner.rate_limits -------------------------------------
-- Rate-limit rows are written by the service role (from the
-- Next.js server-side route), so we lock down client access.
ALTER TABLE planner.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own rate-limit rows (for UI feedback)
CREATE POLICY "rate_limits: select own"
  ON planner.rate_limits FOR SELECT
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE handled exclusively by the service role
-- (anon/authenticated users cannot write rate_limits directly)
