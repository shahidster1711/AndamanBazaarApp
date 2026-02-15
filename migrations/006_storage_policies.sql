-- Migration 006: Storage Policies
-- Description: Create storage buckets and set up RLS policies for avatars and listings
-- Author: AndamanBazaar Team

-- =====================================================
-- 1. Create Buckets (if they don't exist)
--    Note: Supabase storage.buckets is a system table
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. RLS Policies for 'avatars'
-- =====================================================
-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
-- (Assuming the file name contains the user ID or folder structure)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 3. RLS Policies for 'listings'
-- =====================================================
-- Allow public read access to listing images
CREATE POLICY "Listing images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'listings' );

-- Allow authenticated users to upload listing images
CREATE POLICY "Users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listings' AND
  auth.role() = 'authenticated'
);

-- Allow users to update/delete their own listing images
-- Note: This is harder to enforce strictly without a database join,
-- so we typically rely on the application logic or file naming convention (e.g., user_id/listing_id/image.jpg)
-- Here we allow any authenticated user to delete from 'listings' bucket IF they are the owner of the object
-- (owner is strictly enforcing by Supabase storage if owner_id column is used, but RLS on objects table is safer)
CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listings' AND
  auth.uid() = owner
);
