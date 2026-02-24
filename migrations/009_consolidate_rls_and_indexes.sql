-- Migration 009: Consolidate RLS Policies and Remove Unused Indexes
-- Description: Clean up duplicate RLS policies on favorites and listing_images, and remove unused indexes.
-- Author: TRAE
-- Date: 2026-02-24

-- =====================================================
-- 1. CONSOLIDATE FAVORITES POLICIES
-- =====================================================
-- Drop potentially conflicting or duplicate policies
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can manage their favorites" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_policy" ON public.favorites;

-- Recreate standard policies
CREATE POLICY "Users can view own favorites" ON public.favorites 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.favorites 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.favorites 
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. CONSOLIDATE LISTING IMAGES POLICIES
-- =====================================================
-- Drop potentially conflicting or duplicate policies
DROP POLICY IF EXISTS "Images are viewable by everyone" ON public.listing_images;
DROP POLICY IF EXISTS "Users can insert images for own listings" ON public.listing_images;
DROP POLICY IF EXISTS "Users can delete images from own listings" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_select_policy" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_insert_policy" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_delete_policy" ON public.listing_images;

-- Recreate standard policies
CREATE POLICY "Images are viewable by everyone" ON public.listing_images 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert images for own listings" ON public.listing_images 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete images from own listings" ON public.listing_images 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
  );

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================
-- Drop indexes that are not being used by current query patterns
DROP INDEX IF EXISTS public.idx_trending_city_score;
DROP INDEX IF EXISTS public.idx_trending_category_score;

-- =====================================================
-- 4. CLEANUP CHATS POLICIES
-- =====================================================
-- Ensure no duplicate insert policies exist (008 fixed the main one)
DROP POLICY IF EXISTS "Users can insert own chats" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_policy" ON public.chats;
