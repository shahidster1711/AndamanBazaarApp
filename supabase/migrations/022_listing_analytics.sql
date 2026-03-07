-- ============================================================
-- Migration 022: Listing Analytics Dashboard
-- Track views, favorites, chats for seller insights
-- ============================================================

-- Create listing analytics events table
CREATE TABLE IF NOT EXISTS public.listing_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'favorite', 'chat_initiated', 'share', 'phone_reveal', 'price_inquiry')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_listing ON public.listing_analytics(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.listing_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.listing_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_listing_event ON public.listing_analytics(listing_id, event_type);

-- RLS Policies
ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view analytics for own listings" ON public.listing_analytics;
CREATE POLICY "Users view analytics for own listings" ON public.listing_analytics 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.listings 
            WHERE id = listing_analytics.listing_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.listing_analytics;
CREATE POLICY "Anyone can insert analytics" ON public.listing_analytics 
    FOR INSERT WITH CHECK (true);

-- Materialized view for performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.listing_performance_summary AS
SELECT 
    listing_id,
    COUNT(*) FILTER (WHERE event_type = 'view') as total_views,
    COUNT(*) FILTER (WHERE event_type = 'favorite') as total_favorites,
    COUNT(*) FILTER (WHERE event_type = 'chat_initiated') as total_chats,
    COUNT(*) FILTER (WHERE event_type = 'share') as total_shares,
    COUNT(DISTINCT user_id) as unique_visitors,
    MAX(created_at) as last_activity_at,
    MIN(created_at) as first_viewed_at,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'favorite')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'view'), 0) * 100, 2
    ) as favorite_rate,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'chat_initiated')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE event_type = 'view'), 0) * 100, 2
    ) as chat_conversion_rate
FROM public.listing_analytics
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY listing_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summary_listing 
    ON public.listing_performance_summary(listing_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_listing_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.listing_performance_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for daily analytics (last 30 days)
CREATE OR REPLACE VIEW public.listing_daily_analytics AS
SELECT 
    listing_id,
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'view') as views,
    COUNT(*) FILTER (WHERE event_type = 'favorite') as favorites,
    COUNT(*) FILTER (WHERE event_type = 'chat_initiated') as chats,
    COUNT(DISTINCT user_id) as unique_visitors
FROM public.listing_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY listing_id, DATE(created_at)
ORDER BY date DESC;

-- Function to track a listing view (idempotent per session)
CREATE OR REPLACE FUNCTION track_listing_view(
    p_listing_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.listing_analytics (listing_id, event_type, user_id, metadata)
    VALUES (
        p_listing_id, 
        'view', 
        p_user_id,
        jsonb_build_object('session_id', p_session_id)
    );
    
    -- Also increment the views_count on the listing
    UPDATE public.listings
    SET views_count = views_count + 1
    WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics for a user's listings
CREATE OR REPLACE FUNCTION get_user_listings_analytics(user_id UUID)
RETURNS TABLE (
    listing_id UUID,
    title TEXT,
    status TEXT,
    total_views BIGINT,
    total_favorites BIGINT,
    total_chats BIGINT,
    favorite_rate NUMERIC,
    chat_conversion_rate NUMERIC,
    last_activity_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.status,
        COALESCE(ps.total_views, 0) as total_views,
        COALESCE(ps.total_favorites, 0) as total_favorites,
        COALESCE(ps.total_chats, 0) as total_chats,
        COALESCE(ps.favorite_rate, 0) as favorite_rate,
        COALESCE(ps.chat_conversion_rate, 0) as chat_conversion_rate,
        ps.last_activity_at
    FROM public.listings l
    LEFT JOIN public.listing_performance_summary ps ON l.id = ps.listing_id
    WHERE l.user_id = user_id
    ORDER BY COALESCE(ps.last_activity_at, l.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comparison to category average
CREATE OR REPLACE FUNCTION get_category_performance_comparison(
    p_listing_id UUID,
    p_category_id TEXT
)
RETURNS TABLE (
    metric TEXT,
    listing_value NUMERIC,
    category_avg NUMERIC,
    percentile NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH category_stats AS (
        SELECT 
            AVG(total_views) as avg_views,
            AVG(total_favorites) as avg_favorites,
            AVG(favorite_rate) as avg_favorite_rate,
            AVG(chat_conversion_rate) as avg_chat_rate
        FROM public.listing_performance_summary ps
        JOIN public.listings l ON ps.listing_id = l.id
        WHERE l.category_id = p_category_id
        AND l.status IN ('active', 'sold')
    ),
    listing_stats AS (
        SELECT 
            total_views,
            total_favorites,
            favorite_rate,
            chat_conversion_rate
        FROM public.listing_performance_summary
        WHERE listing_id = p_listing_id
    )
    SELECT 
        'views'::TEXT,
        COALESCE(ls.total_views, 0)::NUMERIC,
        COALESCE(cs.avg_views, 0)::NUMERIC,
        CASE 
            WHEN cs.avg_views > 0 THEN ROUND((ls.total_views / cs.avg_views) * 100, 2)
            ELSE 0
        END
    FROM listing_stats ls
    CROSS JOIN category_stats cs
    
    UNION ALL
    
    SELECT 
        'favorites'::TEXT,
        COALESCE(ls.total_favorites, 0)::NUMERIC,
        COALESCE(cs.avg_favorites, 0)::NUMERIC,
        CASE 
            WHEN cs.avg_favorites > 0 THEN ROUND((ls.total_favorites / cs.avg_favorites) * 100, 2)
            ELSE 0
        END
    FROM listing_stats ls
    CROSS JOIN category_stats cs
    
    UNION ALL
    
    SELECT 
        'favorite_rate'::TEXT,
        COALESCE(ls.favorite_rate, 0)::NUMERIC,
        COALESCE(cs.avg_favorite_rate, 0)::NUMERIC,
        CASE 
            WHEN cs.avg_favorite_rate > 0 THEN ROUND((ls.favorite_rate / cs.avg_favorite_rate) * 100, 2)
            ELSE 0
        END
    FROM listing_stats ls
    CROSS JOIN category_stats cs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up old analytics (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM public.listing_analytics
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Refresh materialized view after cleanup
    PERFORM refresh_listing_performance();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
