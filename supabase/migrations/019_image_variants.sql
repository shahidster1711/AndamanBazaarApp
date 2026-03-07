-- ============================================================
-- Migration 019: Image Variants Support
-- Add columns for storing resized image variants
-- ============================================================

-- Add variant columns to listing_images
ALTER TABLE public.listing_images
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS small_url TEXT,
    ADD COLUMN IF NOT EXISTS medium_url TEXT,
    ADD COLUMN IF NOT EXISTS original_width INT,
    ADD COLUMN IF NOT EXISTS original_height INT,
    ADD COLUMN IF NOT EXISTS variants_generated BOOLEAN DEFAULT false;

-- Create index for efficient querying of images needing variant generation
CREATE INDEX IF NOT EXISTS idx_listing_images_variants 
    ON public.listing_images(variants_generated) 
    WHERE variants_generated = false;

-- Function to check if image has all variants
CREATE OR REPLACE FUNCTION has_image_variants(image_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_variants BOOLEAN;
BEGIN
    SELECT variants_generated INTO has_variants
    FROM public.listing_images
    WHERE id = image_id;
    RETURN COALESCE(has_variants, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS to allow service role to update variants
DROP POLICY IF EXISTS "Users can update images for own listings" ON public.listing_images;
CREATE POLICY "Users can update images for own listings" ON public.listing_images 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
        OR auth.role() = 'service_role'
    );
