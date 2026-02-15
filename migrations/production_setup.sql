-- ANDAMANBAZAAR PRODUCTION DATABASE SETUP
-- Consolidates all migrations into one script for easy execution.

-- 1. BASE SCHEMA
-- (Assuming schema.sql is run first, but including key parts if missing)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RECOMMENDATIONS & TRENDING
-- (From migrations/001_recommendations_schema.sql)
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  listing_id UUID REFERENCES public.listings(id),
  interaction_type TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CHAT ENHANCEMENTS
-- (From migrations/002_chat_enhancements.sql)
CREATE TABLE IF NOT EXISTS public.chat_typing_events (
  chat_id UUID REFERENCES public.chats(id),
  user_id UUID REFERENCES auth.users(id),
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- 4. SECURITY & AUDIT
-- (From migrations/003_security_enhancements.sql)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STORAGE POLICIES (Critical for launch)
-- (From migrations/006_storage_policies.sql)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('listings', 'avatars'));
CREATE POLICY "Authenticated Users Can Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('listings', 'avatars') AND auth.role() = 'authenticated'
);
CREATE POLICY "Users Can Update Own Objects" ON storage.objects FOR UPDATE USING (
  bucket_id IN ('listings', 'avatars') AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. CHAT CONSTRAINTS & SOFT DELETE
-- (From migrations/005_chat_constraints_soft_delete.sql)
ALTER TABLE public.chats ADD CONSTRAINT unique_listing_buyer UNIQUE (listing_id, buyer_id);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_listings_not_deleted ON public.listings(id) WHERE deleted_at IS NULL;
