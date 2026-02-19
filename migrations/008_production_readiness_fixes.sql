-- Migration 008: Production Readiness Fixes
-- Description: Critical security and data integrity fixes from production readiness audit
-- Author: AndamanBazaar Team
-- Date: 2026-02-19

-- =====================================================
-- S1: Add audit_logs INSERT policy
-- The client-side logAuditEvent() needs this to actually write rows
-- =====================================================
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- S2: Fix storage upload policy for listings bucket
-- Currently any authenticated user can upload to any path.
-- Restrict so uploads must go under the user's own folder.
-- =====================================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "Users can upload listing images" ON storage.objects;

-- Re-create with path-based ownership
CREATE POLICY "Users can upload listing images to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listings' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- D3: Remove physical DELETE policy on listings
-- The app uses soft-delete (status='deleted'), so physical
-- DELETE should not be allowed via RLS.
-- =====================================================
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;

-- =====================================================
-- D4: Fix chat creation RLS to validate seller_id
-- Ensure seller_id matches the actual listing owner
-- =====================================================
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

CREATE POLICY "Users can create chats" ON public.chats
FOR INSERT WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = listing_id AND user_id = seller_id
  )
);

-- =====================================================
-- D2: View count deduplication table
-- Track unique views per listing per user per day
-- =====================================================
CREATE TABLE IF NOT EXISTS public.listing_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(listing_id, viewer_id, viewed_date)
);

-- Allow anonymous views (no viewer_id) but deduplicate by session
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_views_session
  ON public.listing_views(listing_id, session_id, viewed_date)
  WHERE viewer_id IS NULL AND session_id IS NOT NULL;

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON public.listing_views(listing_id, viewed_date);
CREATE INDEX IF NOT EXISTS idx_listing_views_viewer ON public.listing_views(viewer_id, viewed_date);

-- RLS
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view listing view counts" ON public.listing_views
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert views" ON public.listing_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Replace the old increment function with a deduplicated version
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS void AS $$
DECLARE
  v_viewer_id UUID;
BEGIN
  v_viewer_id := auth.uid();

  -- Try to insert a unique view record
  INSERT INTO public.listing_views (listing_id, viewer_id, viewed_date)
  VALUES (p_listing_id, v_viewer_id, CURRENT_DATE)
  ON CONFLICT (listing_id, viewer_id, viewed_date) DO NOTHING;

  -- Update the denormalized count from actual unique views
  UPDATE public.listings
  SET views_count = (
    SELECT COUNT(*) FROM public.listing_views WHERE listing_id = p_listing_id
  )
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT: Record migration application
-- =====================================================
INSERT INTO public.audit_logs (user_id, action, status, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'MIGRATION_008_APPLIED',
  'success',
  '{"description": "Production readiness fixes: audit_logs INSERT policy, storage restrictions, soft-delete enforcement, chat RLS, view deduplication"}'::jsonb
);
