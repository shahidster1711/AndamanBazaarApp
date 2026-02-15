-- Migration: AI Recommendations Schema
-- Description: Add tables for tracking user interactions and caching recommendations
-- Author: AndamanBazaar Team
-- Date: 2026-02-12

-- =====================================================
-- USER INTERACTIONS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'chat_initiated', 'search_result_click', 'recommendation_click')),
  metadata JSONB DEFAULT '{}'::jsonb, -- For storing additional context (search query, position, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_interactions_user_type ON public.user_interactions(user_id, interaction_type, created_at DESC);
CREATE INDEX idx_user_interactions_listing ON public.user_interactions(listing_id, interaction_type);
CREATE INDEX idx_user_interactions_created ON public.user_interactions(created_at DESC);

-- Row Level Security
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" ON public.user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON public.user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RECOMMENDATIONS CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recommendations_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  score FLOAT NOT NULL DEFAULT 0,
  strategy TEXT NOT NULL CHECK (strategy IN ('collaborative', 'content', 'trending', 'personalized', 'location', 'hybrid')),
  metadata JSONB DEFAULT '{}'::jsonb, -- For storing why it was recommended
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id, strategy)
);

-- Indexes for fast retrieval
CREATE INDEX idx_recommendations_user_score ON public.recommendations_cache(user_id, score DESC, expires_at DESC);
CREATE INDEX idx_recommendations_expires ON public.recommendations_cache(expires_at);

-- Row Level Security
ALTER TABLE public.recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON public.recommendations_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Only backend can insert/update recommendations (via service role key)
-- No INSERT/UPDATE policies for regular users

-- =====================================================
-- TRENDING LISTINGS CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trending_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  city TEXT NOT NULL,
  category_id TEXT,
  score FLOAT NOT NULL DEFAULT 0, -- Calculated from views, favorites, chats in last 7 days
  rank INTEGER,
  period TEXT DEFAULT 'weekly' CHECK (period IN ('daily', 'weekly', 'monthly')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trending_city_score ON public.trending_listings(city, score DESC);
CREATE INDEX idx_trending_category_score ON public.trending_listings(category_id, score DESC);

-- Row Level Security
ALTER TABLE public.trending_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending listings are viewable by everyone" ON public.trending_listings
  FOR SELECT USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean expired recommendations
CREATE OR REPLACE FUNCTION clean_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.recommendations_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborative filtering recommendations
CREATE OR REPLACE FUNCTION get_similar_users_listings(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(listing_id UUID, similarity_score FLOAT) AS $$
BEGIN
  RETURN QUERY
  -- Find users who favorited similar listings
  WITH user_favorites AS (
    SELECT DISTINCT listing_id
    FROM public.favorites
    WHERE user_id = p_user_id
  ),
  similar_users AS (
    SELECT 
      f.user_id,
      COUNT(*) as common_favorites
    FROM public.favorites f
    WHERE f.listing_id IN (SELECT listing_id FROM user_favorites)
      AND f.user_id != p_user_id
    GROUP BY f.user_id
    ORDER BY common_favorites DESC
    LIMIT 20
  )
  SELECT DISTINCT
    f.listing_id,
    (su.common_favorites::FLOAT / 10.0) as similarity_score
  FROM public.favorites f
  INNER JOIN similar_users su ON f.user_id = su.user_id
  WHERE f.listing_id NOT IN (SELECT listing_id FROM user_favorites)
    AND f.listing_id NOT IN (
      SELECT listing_id FROM public.user_interactions 
      WHERE user_id = p_user_id AND interaction_type = 'view'
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trending listings (should be called by cron job)
CREATE OR REPLACE FUNCTION update_trending_listings()
RETURNS void AS $$
BEGIN
  -- Clear old data
  DELETE FROM public.trending_listings;
  
  -- Calculate trending based on last 7 days activity
  WITH listing_scores AS (
    SELECT 
      l.id as listing_id,
      l.city,
      l.category_id,
      (
        -- Weight: views = 1, favorites = 5, chats = 10
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'view' THEN 1 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'favorite' THEN 5 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'chat_initiated' THEN 10 ELSE 0 END), 0)
      ) as score
    FROM public.listings l
    LEFT JOIN public.user_interactions ui ON l.id = ui.listing_id
    WHERE l.status = 'active'
      AND l.created_at > NOW() - INTERVAL '30 days'
      AND (ui.created_at > NOW() - INTERVAL '7 days' OR ui.created_at IS NULL)
    GROUP BY l.id, l.city, l.category_id
    HAVING (
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'view' THEN 1 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'favorite' THEN 5 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN ui.interaction_type = 'chat_initiated' THEN 10 ELSE 0 END), 0)
      ) > 0
  ),
  ranked_listings AS (
    SELECT 
      listing_id,
      city,
      category_id,
      score,
      ROW_NUMBER() OVER (ORDER BY score DESC) as rank
    FROM listing_scores
  )
  INSERT INTO public.trending_listings (listing_id, city, category_id, score, rank)
  SELECT listing_id, city, category_id, score, rank
  FROM ranked_listings
  WHERE rank <= 100; -- Keep top 100 trending
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA / COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_interactions IS 'Tracks all user interactions with listings for recommendation engine';
COMMENT ON TABLE public.recommendations_cache IS 'Pre-computed personalized recommendations with expiry';
COMMENT ON TABLE public.trending_listings IS 'Trending listings calculated from recent activity';
