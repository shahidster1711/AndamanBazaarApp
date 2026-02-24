-- ============================================================
-- Migration 011: Listing Boosts + Cashfree Integration
-- Adds the listing_boosts table for the "Featured Ad" product,
-- plus a featured_until column on listings.
-- ============================================================
-- 1. Add featured_until to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS featured_tier TEXT CHECK (featured_tier IN ('spark', 'boost', 'power'));
-- 2. Listing Boosts table
CREATE TABLE IF NOT EXISTS public.listing_boosts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('spark', 'boost', 'power')),
    amount_inr INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'paid',
            'expired',
            'failed',
            'refunded'
        )
    ),
    cashfree_order_id TEXT,
    cashfree_payment_id TEXT,
    payment_method TEXT DEFAULT 'upi',
    featured_from TIMESTAMP WITH TIME ZONE,
    featured_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing_id ON public.listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_cashfree_order ON public.listing_boosts(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_status ON public.listing_boosts(status);
CREATE INDEX IF NOT EXISTS idx_listings_featured_until ON public.listings(featured_until)
WHERE is_featured = true;
-- 4. RLS
ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;
-- Users can view their own boosts
CREATE POLICY "Users can view own boosts" ON public.listing_boosts FOR
SELECT USING (auth.uid() = user_id);
-- Users can insert boosts for their own listings
CREATE POLICY "Users can create boosts for own listings" ON public.listing_boosts FOR
INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.listings
            WHERE id = listing_id
                AND user_id = auth.uid()
        )
    );
-- Service role can update boosts (for webhook)
-- Note: service_role bypasses RLS, so this policy is for regular users only
CREATE POLICY "Users can view boost status" ON public.listing_boosts FOR
UPDATE USING (auth.uid() = user_id);
-- 5. Function to automatically expire featured listings
CREATE OR REPLACE FUNCTION public.expire_featured_listings() RETURNS void
SET search_path = public AS $$ BEGIN
UPDATE public.listings
SET is_featured = false,
    featured_tier = NULL
WHERE is_featured = true
    AND featured_until IS NOT NULL
    AND featured_until < NOW();
UPDATE public.listing_boosts
SET status = 'expired',
    updated_at = NOW()
WHERE status = 'paid'
    AND featured_until IS NOT NULL
    AND featured_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. Audit log for payments (optional, lightweight)
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    boost_id UUID REFERENCES public.listing_boosts(id),
    event_type TEXT NOT NULL,
    cashfree_order_id TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
-- Only service role can write to audit log (no user access needed)
-- No SELECT policy = users cannot read payment logs