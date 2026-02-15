-- Migration: Post Ad Enhancements
-- Description: Add new fields for the redesigned Post-an-Ad flow
-- Author: AndamanBazaar Team
-- Date: 2026-02-15
-- Depends on: schema.sql (base tables must exist)

-- =====================================================
-- EXTEND LISTINGS TABLE
-- =====================================================

-- Negotiability
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT true;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS min_price NUMERIC;

-- Item details
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS item_age TEXT
    CHECK (item_age IS NULL OR item_age IN ('<1m', '1-6m', '6-12m', '1-2y', '2-5y', '5y+'));

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS accessories TEXT[] DEFAULT '{}';

-- Contact & AI
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS contact_preferences JSONB DEFAULT '{"chat": true}'::jsonb;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;

-- Moderation
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'auto_approved'
    CHECK (moderation_status IN ('auto_approved', 'pending_review', 'approved', 'rejected'));

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Draft support
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS draft_step INTEGER;

-- Idempotency
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- =====================================================
-- UPDATE STATUS CHECK CONSTRAINT
-- =====================================================

-- Drop existing constraint and re-add with pending_review
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_status_check
    CHECK (status IN ('draft', 'pending_review', 'active', 'sold', 'expired', 'deleted'));

-- =====================================================
-- NEW INDEXES
-- =====================================================

-- Fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_listings_idempotency
  ON public.listings(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Moderation queue
CREATE INDEX IF NOT EXISTS idx_listings_moderation
  ON public.listings(moderation_status, created_at DESC)
  WHERE moderation_status = 'pending_review';

-- Draft cleanup
CREATE INDEX IF NOT EXISTS idx_listings_drafts
  ON public.listings(status, updated_at)
  WHERE status = 'draft';

-- =====================================================
-- HELPER: Duplicate title detection
-- =====================================================

-- Requires pg_trgm extension for similarity()
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.check_duplicate_listing(
  p_user_id UUID,
  p_title TEXT,
  p_category_id TEXT,
  p_threshold FLOAT DEFAULT 0.6
) RETURNS TABLE(
  listing_id UUID,
  existing_title TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    similarity(l.title, p_title)::FLOAT as sim_score
  FROM public.listings l
  WHERE l.user_id = p_user_id
    AND l.status = 'active'
    AND l.category_id = p_category_id
    AND similarity(l.title, p_title) > p_threshold
  ORDER BY sim_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_duplicate_listing IS 'Check for similar active listings by the same user to prevent duplicates';

-- =====================================================
-- HELPER: Price suggestion based on category
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_price_suggestion(
  p_category_id TEXT,
  p_condition TEXT DEFAULT 'good'
) RETURNS TABLE(
  avg_price NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  listing_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(l.price), 0) as avg_price,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY l.price)::NUMERIC, 0) as min_price,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY l.price)::NUMERIC, 0) as max_price,
    COUNT(*) as listing_count
  FROM public.listings l
  WHERE l.category_id = p_category_id
    AND l.status = 'active'
    AND l.condition = COALESCE(p_condition, l.condition)
    AND l.created_at > NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_price_suggestion IS 'Get price statistics for a category to suggest pricing to sellers';

-- =====================================================
-- SCHEDULED: Draft cleanup (run via cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.clean_stale_drafts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.listings
    WHERE status = 'draft'
      AND updated_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULED: Expire old listings (run via cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS INTEGER AS $$
DECLARE
  v_expired INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.listings
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
      AND created_at < NOW() - INTERVAL '60 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired FROM expired;

  RETURN v_expired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.listings.is_negotiable IS 'Whether the seller accepts negotiation on price';
COMMENT ON COLUMN public.listings.min_price IS 'Minimum acceptable price (hidden from buyers, used for chat hints)';
COMMENT ON COLUMN public.listings.item_age IS 'Age of the item since first purchase';
COMMENT ON COLUMN public.listings.accessories IS 'Array of included accessories (charger, box, etc.)';
COMMENT ON COLUMN public.listings.contact_preferences IS 'JSON: {chat: bool, phone: bool, whatsapp: bool}';
COMMENT ON COLUMN public.listings.ai_metadata IS 'Stores AI-generated suggestions and acceptance data';
COMMENT ON COLUMN public.listings.moderation_status IS 'Pre/post-publish moderation state';
COMMENT ON COLUMN public.listings.draft_step IS 'Last completed step for draft resume (1-5)';
COMMENT ON COLUMN public.listings.idempotency_key IS 'Client-generated UUID to prevent duplicate submissions';
