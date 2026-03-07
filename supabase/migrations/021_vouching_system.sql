-- ============================================================
-- Migration 021: Community Vouching System
-- Allow verified users to vouch for new sellers
-- ============================================================

-- Create vouch relationships table
CREATE TABLE IF NOT EXISTS public.vouch_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vouchee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vouch_message TEXT CHECK (LENGTH(vouch_message) <= 500),
    is_active BOOLEAN DEFAULT true,
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
    
    UNIQUE(voucher_id, vouchee_id),
    CHECK (voucher_id != vouchee_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_vouches_vouchee ON public.vouch_relationships(vouchee_id);
CREATE INDEX IF NOT EXISTS idx_vouches_voucher ON public.vouch_relationships(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vouches_active ON public.vouch_relationships(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.vouch_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vouches are public" ON public.vouch_relationships;
CREATE POLICY "Vouches are public" ON public.vouch_relationships 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Verified users can vouch" ON public.vouch_relationships;
CREATE POLICY "Verified users can vouch" ON public.vouch_relationships 
    FOR INSERT WITH CHECK (
        auth.uid() = voucher_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND trust_level IN ('verified', 'legend')
        )
    );

DROP POLICY IF EXISTS "Vouchers can delete own vouches" ON public.vouch_relationships;
CREATE POLICY "Vouchers can delete own vouches" ON public.vouch_relationships 
    FOR DELETE USING (auth.uid() = voucher_id);

-- Add vouch count and penalty fields to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS vouch_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vouch_given_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS voucher_penalty_until TIMESTAMPTZ;

-- Function to update vouch counts
CREATE OR REPLACE FUNCTION update_vouch_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        -- Increment vouchee's vouch count
        UPDATE public.profiles
        SET vouch_count = vouch_count + 1
        WHERE id = NEW.vouchee_id;
        
        -- Increment voucher's given count
        UPDATE public.profiles
        SET vouch_given_count = vouch_given_count + 1
        WHERE id = NEW.voucher_id;
        
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
        -- Decrement vouchee's vouch count
        UPDATE public.profiles
        SET vouch_count = GREATEST(0, vouch_count - 1)
        WHERE id = COALESCE(NEW.vouchee_id, OLD.vouchee_id);
        
        -- Decrement voucher's given count
        UPDATE public.profiles
        SET vouch_given_count = GREATEST(0, vouch_given_count - 1)
        WHERE id = COALESCE(NEW.voucher_id, OLD.voucher_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vouch_change ON public.vouch_relationships;
CREATE TRIGGER on_vouch_change
    AFTER INSERT OR UPDATE OR DELETE ON public.vouch_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_vouch_counts();

-- Function to check if user has available vouch slots
CREATE OR REPLACE FUNCTION has_vouch_slots_available(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_vouches INT;
    max_vouches INT := 3;
BEGIN
    SELECT COUNT(*) INTO active_vouches
    FROM public.vouch_relationships
    WHERE voucher_id = user_id
    AND is_active = true
    AND expires_at > NOW();
    
    RETURN active_vouches < max_vouches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply penalty when vouchee is reported/banned
CREATE OR REPLACE FUNCTION apply_vouching_penalty(
    voucher_id UUID,
    vouchee_id UUID,
    penalty_days INT DEFAULT 30
)
RETURNS void AS $$
BEGIN
    -- Mark vouch relationship with penalty
    UPDATE public.vouch_relationships
    SET penalty_applied = true,
        is_active = false
    WHERE voucher_id = voucher_id
    AND vouchee_id = vouchee_id;
    
    -- Apply temporary trust downgrade to voucher
    UPDATE public.profiles
    SET voucher_penalty_until = NOW() + (penalty_days || ' days')::INTERVAL,
        trust_level = CASE 
            WHEN trust_level = 'legend' THEN 'verified'
            WHEN trust_level = 'verified' THEN 'newbie'
            ELSE trust_level
        END
    WHERE id = voucher_id
    AND (voucher_penalty_until IS NULL OR voucher_penalty_until < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for vouch details with voucher info
CREATE OR REPLACE VIEW public.vouch_details AS
SELECT 
    vr.id,
    vr.voucher_id,
    vr.vouchee_id,
    vr.vouch_message,
    vr.is_active,
    vr.created_at,
    vr.expires_at,
    p.name as voucher_name,
    p.trust_level as voucher_trust_level,
    p.is_location_verified as voucher_verified,
    p.total_listings as voucher_total_listings,
    p.successful_sales as voucher_successful_sales
FROM public.vouch_relationships vr
LEFT JOIN public.profiles p ON vr.voucher_id = p.id
WHERE vr.is_active = true
AND vr.expires_at > NOW();

-- Function to get vouches for a user
CREATE OR REPLACE FUNCTION get_user_vouches(user_id UUID)
RETURNS TABLE (
    vouch_id UUID,
    voucher_id UUID,
    voucher_name TEXT,
    voucher_trust_level TEXT,
    vouch_message TEXT,
    created_at TIMESTAMPTZ,
    days_remaining INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vr.id,
        vr.voucher_id,
        p.name,
        p.trust_level,
        vr.vouch_message,
        vr.created_at,
        EXTRACT(DAY FROM (vr.expires_at - NOW()))::INT
    FROM public.vouch_relationships vr
    LEFT JOIN public.profiles p ON vr.voucher_id = p.id
    WHERE vr.vouchee_id = user_id
    AND vr.is_active = true
    AND vr.expires_at > NOW()
    ORDER BY vr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
