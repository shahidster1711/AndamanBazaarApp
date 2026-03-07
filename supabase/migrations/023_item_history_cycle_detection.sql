-- ============================================================
-- Migration 023: Item History Cycle Detection Fix
-- Prevent infinite loops in recursive CTE queries
-- ============================================================

-- Drop and recreate the get_item_chain function with cycle detection
DROP FUNCTION IF EXISTS get_item_chain(UUID);

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
        -- Base case: start with the given listing
        SELECT 
            l.id,
            l.user_id,
            l.title,
            l.price,
            l.created_at,
            0 as depth,
            ARRAY[l.id] as path -- Track visited nodes to detect cycles
        FROM public.listings l
        WHERE l.id = listing_id
        
        UNION ALL
        
        -- Recursive case: follow parent links
        SELECT 
            l.id,
            l.user_id,
            l.title,
            l.price,
            l.created_at,
            c.depth + 1,
            c.path || l.id -- Add current node to path
        FROM public.listings l
        INNER JOIN chain c ON l.id = c.parent_listing_id
        WHERE 
            l.id != ALL(c.path) -- Prevent cycles: don't revisit nodes
            AND c.depth < 50 -- Maximum depth limit as safety net
    )
    SELECT 
        c.id,
        c.user_id,
        COALESCE(p.name, 'Unknown Seller') as seller_name,
        COALESCE(p.trust_level, 'newbie') as seller_trust_level,
        c.title,
        c.price,
        c.created_at,
        c.depth
    FROM chain c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    ORDER BY c.depth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the item_history view with the same cycle detection
DROP VIEW IF EXISTS public.item_history;

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
        id as root_id,
        ARRAY[id] as path -- Track path for cycle detection
    FROM public.listings
    WHERE parent_listing_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child listings (resales) with cycle detection
    SELECT 
        l.id,
        l.parent_listing_id,
        l.user_id,
        l.title,
        l.price,
        l.created_at,
        l.status,
        h.depth + 1,
        h.root_id,
        h.path || l.id
    FROM public.listings l
    INNER JOIN history_chain h ON l.parent_listing_id = h.id
    WHERE 
        l.id != ALL(h.path) -- Prevent cycles
        AND h.depth < 50 -- Maximum depth limit
)
SELECT 
    hc.*,
    p.name as seller_name,
    p.trust_level as seller_trust_level,
    p.is_location_verified as seller_verified
FROM history_chain hc
LEFT JOIN public.profiles p ON hc.user_id = p.id;

-- Add constraint to prevent circular references in parent_listing_id
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'prevent_circular_parent_reference'
    ) THEN
        ALTER TABLE public.listings 
        ADD CONSTRAINT prevent_circular_parent_reference 
        CHECK (
            parent_listing_id IS NULL 
            OR parent_listing_id != id
        );
    END IF;
END $$;

-- Function to validate no circular references exist
CREATE OR REPLACE FUNCTION validate_no_circular_references()
RETURNS TABLE(listing_id UUID, has_cycle BOOLEAN, cycle_path TEXT) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE cycle_check AS (
        SELECT 
            id,
            parent_listing_id,
            ARRAY[id] as path,
            0 as depth
        FROM public.listings
        WHERE parent_listing_id IS NOT NULL
        
        UNION ALL
        
        SELECT 
            l.id,
            l.parent_listing_id,
            cc.path || l.id,
            cc.depth + 1
        FROM public.listings l
        INNER JOIN cycle_check cc ON l.id = cc.parent_listing_id
        WHERE 
            l.id != ALL(cc.path)
            AND cc.depth < 20
    )
    SELECT 
        path[1] as listing_id,
        true as has_cycle,
        array_to_string(path, ' -> ') as cycle_path
    FROM cycle_check
    WHERE depth > 0 AND parent_listing_id = ANY(path);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
