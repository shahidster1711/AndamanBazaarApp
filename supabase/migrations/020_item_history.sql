-- ============================================================
-- Migration 020: Item History Tracking
-- Track ownership chain for resold items
-- ============================================================

-- Add parent listing reference to track resale chain
ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS parent_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_resale BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS original_purchase_date DATE,
    ADD COLUMN IF NOT EXISTS resale_count INT DEFAULT 0;

-- Create index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_listings_parent ON public.listings(parent_listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_resale ON public.listings(is_resale) WHERE is_resale = true;

-- Create view for item history chain
CREATE OR REPLACE VIEW public.item_history AS
WITH RECURSIVE history_chain AS (
    -- Base case: root listings (not resales)
    SELECT 
        id,
        NULL::UUID as parent_listing_id,
        user_id,
        title,
        price,
        created_at,
        status,
        0 as depth,
        id as root_id
    FROM public.listings
    WHERE parent_listing_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child listings (resales)
    SELECT 
        l.id,
        l.parent_listing_id,
        l.user_id,
        l.title,
        l.price,
        l.created_at,
        l.status,
        h.depth + 1,
        h.root_id
    FROM public.listings l
    INNER JOIN history_chain h ON l.parent_listing_id = h.id
)
SELECT 
    hc.*,
    p.name as seller_name,
    p.trust_level as seller_trust_level,
    p.is_location_verified as seller_verified
FROM history_chain hc
LEFT JOIN public.profiles p ON hc.user_id = p.id;

-- Function to calculate resale chain length
CREATE OR REPLACE FUNCTION get_resale_chain_length(listing_id UUID)
RETURNS INT AS $$
DECLARE
    length INT := 0;
    current_id UUID := listing_id;
    parent_id UUID;
BEGIN
    WHILE current_id IS NOT NULL LOOP
        SELECT parent_listing_id INTO parent_id
        FROM public.listings
        WHERE id = current_id;
        
        IF parent_id IS NOT NULL THEN
            length := length + 1;
            current_id := parent_id;
        ELSE
            current_id := NULL;
        END IF;
    END LOOP;
    
    RETURN length;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get full chain for a listing
CREATE OR REPLACE FUNCTION get_item_chain(listing_id UUID)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_name TEXT,
    seller_trust_level TEXT,
    title TEXT,
    price NUMERIC,
    sold_at TIMESTAMPTZ,
    depth INT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE chain AS (
        SELECT 
            l.id,
            l.user_id,
            l.title,
            l.price,
            l.created_at,
            0 as depth
        FROM public.listings l
        WHERE l.id = listing_id
        
        UNION ALL
        
        SELECT 
            l.id,
            l.user_id,
            l.title,
            l.price,
            l.created_at,
            c.depth + 1
        FROM public.listings l
        INNER JOIN chain c ON l.id = c.parent_listing_id
    )
    SELECT 
        c.id,
        c.user_id,
        p.name,
        p.trust_level,
        c.title,
        c.price,
        c.created_at,
        c.depth
    FROM chain c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    ORDER BY c.depth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update resale count when listing is marked as sold
CREATE OR REPLACE FUNCTION handle_listing_sold()
RETURNS TRIGGER AS $$
DECLARE
    root_id UUID;
BEGIN
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        -- Find the root of the chain
        WITH RECURSIVE root_finder AS (
            SELECT id, parent_listing_id, 1 as depth
            FROM public.listings
            WHERE id = NEW.id
            
            UNION ALL
            
            SELECT l.id, l.parent_listing_id, rf.depth + 1
            FROM public.listings l
            INNER JOIN root_finder rf ON l.id = rf.parent_listing_id
        )
        SELECT id INTO root_id
        FROM root_finder
        WHERE parent_listing_id IS NULL
        ORDER BY depth DESC
        LIMIT 1;
        
        -- Update root's resale count
        IF root_id IS NOT NULL THEN
            UPDATE public.listings
            SET resale_count = resale_count + 1
            WHERE id = root_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_listing_sold ON public.listings;
CREATE TRIGGER on_listing_sold
    AFTER UPDATE ON public.listings
    FOR EACH ROW
    WHEN (NEW.status = 'sold' AND OLD.status != 'sold')
    EXECUTE FUNCTION handle_listing_sold();

-- Add "Platform Loyalist" achievement check
CREATE OR REPLACE FUNCTION check_platform_loyalist_achievement(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    resale_count INT;
BEGIN
    SELECT COUNT(*) INTO resale_count
    FROM public.listings
    WHERE user_id = user_id
    AND is_resale = true;
    
    RETURN resale_count >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
