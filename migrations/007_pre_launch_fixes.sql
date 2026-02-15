-- Migration 007: Pre-Launch Security & SEO Fixes
-- Description: Add missing RLS DELETE policy for listing_images and other final tweaks.

-- 1. SECURITY: Add DELETE policy for listing_images (Fixes IDOR)
-- This ensures only the listing owner can delete images associated with their listing.
CREATE POLICY "Users can delete images from own listings" 
ON public.listing_images 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.listings 
    WHERE id = listing_images.listing_id 
    AND user_id = auth.uid()
  )
);

-- 2. VERIFICATION: Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 3. AUDIT LOG: Record the final pre-production fix application
-- (Assuming audit_logs table exists from migration 003)
INSERT INTO public.audit_logs (user_id, action, status, details)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- System / Admin
  'PRE_PRODUCTION_FIXES_APPLIED',
  'success',
  'Applied missing RLS DELETE policies and verified security posture for launch.'
);
