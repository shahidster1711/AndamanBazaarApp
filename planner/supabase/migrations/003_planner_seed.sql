-- =============================================================
-- Migration 003: optional seed data (dev/staging only)
-- Creates example planner rows for integration testing.
-- SKIP this in production.
-- =============================================================

-- No seed rows for auth-protected tables in production.
-- This file is intentionally minimal.
-- Run manually in staging: psql -f 003_planner_seed.sql

SELECT 'planner schema ready' AS status;
