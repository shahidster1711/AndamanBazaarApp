-- ============================================================
-- Migration 018: Offline Sync Queue
-- Creates table for queuing operations when offline
-- ============================================================

-- Create offline sync queue table
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('listing', 'message', 'profile_update')),
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON public.offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON public.offline_sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_entity ON public.offline_sync_queue(entity_type);

-- RLS Policies
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own queue" ON public.offline_sync_queue;
CREATE POLICY "Users manage own queue" ON public.offline_sync_queue 
    FOR ALL USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Function to clean up old synced items
CREATE OR REPLACE FUNCTION cleanup_synced_queue()
RETURNS void AS $$
BEGIN
    DELETE FROM public.offline_sync_queue 
    WHERE sync_status = 'synced' 
    AND synced_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add to realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE pr.prpubid = (
            SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime'
        )
        AND n.nspname = 'public'
        AND c.relname = 'offline_sync_queue'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.offline_sync_queue';
    END IF;
END $$;
