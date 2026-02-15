-- Migration 005: Chat constraints & Soft-delete
-- Fixes P0-3: Prevent duplicate chats per listing+buyer
-- Fixes P1: Soft-delete listings instead of hard delete

-- =============================================================
-- 1. UNIQUE constraint on chats(listing_id, buyer_id)
--    Prevents duplicate chat rooms for the same buyer+listing
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chats_listing_buyer_unique'
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_listing_buyer_unique UNIQUE (listing_id, buyer_id);
  END IF;
END $$;

-- =============================================================
-- 2. Soft-delete support for listings
--    Instead of DELETE, set status = 'deleted'
--    Add deleted_at timestamp for recovery window
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Index for filtering out soft-deleted listings efficiently
CREATE INDEX IF NOT EXISTS idx_listings_not_deleted
  ON public.listings (status)
  WHERE status != 'deleted';

-- =============================================================
-- 3. Update RLS policies to exclude deleted listings from public view
-- =============================================================
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings are viewable by everyone" ON public.listings
  FOR SELECT USING (status != 'deleted' OR user_id = auth.uid());

-- =============================================================
-- 4. Function to auto-clean chats when listing is sold/deleted
--    Does not delete chats, but marks them for reference
-- =============================================================
CREATE OR REPLACE FUNCTION public.clean_stale_listing_data()
RETURNS void AS $$
BEGIN
  -- Delete listings that have been soft-deleted for more than 30 days
  DELETE FROM public.listings
  WHERE status = 'deleted'
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
