-- Migration: Chat Enhancements
-- Description: Add features for real-time chat like message status, reactions, and metadata
-- Author: AndamanBazaar Team
-- Date: 2026-02-12

-- =====================================================
-- EXTEND MESSAGES TABLE
-- =====================================================

-- Add message status tracking
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON public.messages(chat_id, is_read, created_at DESC);

-- =====================================================
-- EXTEND CHATS TABLE
-- =====================================================

-- Add chat metadata
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add index for active chats
CREATE INDEX IF NOT EXISTS idx_chats_active 
  ON public.chats(is_archived, last_message_at DESC);

-- =====================================================
-- TYPING INDICATORS (EPHEMERAL - use Firebase)
-- Note: Typing indicators will be handled client-side via Firebase Realtime DB
-- This table is for fallback/analytics only
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_typing_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Index for recent typing events
CREATE INDEX IF NOT EXISTS idx_typing_events_chat 
  ON public.chat_typing_events(chat_id, started_at DESC);

-- Row Level Security
ALTER TABLE public.chat_typing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view typing in their chats" ON public.chat_typing_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id 
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own typing events" ON public.chat_typing_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- MESSAGE READ RECEIPTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_chat_id UUID,
  p_up_to_message_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
  v_user_id UUID := auth.uid();
  v_other_user_id UUID;
BEGIN
  -- Get the other user in the chat
  SELECT 
    CASE 
      WHEN buyer_id = v_user_id THEN seller_id 
      ELSE buyer_id 
    END INTO v_other_user_id
  FROM public.chats
  WHERE id = p_chat_id;
  
  -- Mark messages as read
  WITH updated AS (
    UPDATE public.messages
    SET 
      is_read = true,
      read_at = NOW()
    WHERE chat_id = p_chat_id
      AND sender_id = v_other_user_id
      AND is_read = false
      AND created_at <= (SELECT created_at FROM public.messages WHERE id = p_up_to_message_id)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;
  
  -- Reset unread count for current user
  UPDATE public.chats
  SET 
    buyer_unread_count = CASE WHEN buyer_id = v_user_id THEN 0 ELSE buyer_unread_count END,
    seller_unread_count = CASE WHEN seller_id = v_user_id THEN 0 ELSE seller_unread_count END,
    last_active_at = NOW()
  WHERE id = p_chat_id;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ARCHIVE/UNARCHIVE CHAT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION archive_chat(
  p_chat_id UUID,
  p_archive BOOLEAN DEFAULT true
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chats 
    WHERE id = p_chat_id 
      AND (buyer_id = v_user_id OR seller_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Update chat
  UPDATE public.chats
  SET 
    is_archived = p_archive,
    archived_by = CASE WHEN p_archive THEN v_user_id ELSE NULL END,
    archived_at = CASE WHEN p_archive THEN NOW() ELSE NULL END
  WHERE id = p_chat_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE MESSAGE DELIVERY STATUS
-- =====================================================

-- Trigger to auto-set delivered_at when message is created
CREATE OR REPLACE FUNCTION set_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivered_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_delivered
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION set_message_delivered();

-- =====================================================
-- CHAT ACTIVITY UPDATER
-- =====================================================

-- Update last_active_at on chat when messages are sent
CREATE OR REPLACE FUNCTION update_chat_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET last_active_at = NOW()
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_activity_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_activity();

-- =====================================================
-- MESSAGE DELETION (SOFT DELETE)
-- =====================================================

CREATE OR REPLACE FUNCTION delete_message(p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Only allow sender to delete
  UPDATE public.messages
  SET 
    message_text = '[Message deleted]',
    image_url = NULL,
    deleted_at = NOW()
  WHERE id = p_message_id
    AND sender_id = v_user_id
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GET UNREAD MESSAGE COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total INTEGER;
BEGIN
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN buyer_id = v_user_id THEN buyer_unread_count
        WHEN seller_id = v_user_id THEN seller_unread_count
        ELSE 0
      END
    ), 0) INTO v_total
  FROM public.chats
  WHERE (buyer_id = v_user_id OR seller_id = v_user_id)
    AND is_archived = false;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEAN UP OLD TYPING EVENTS (CRON JOB)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_typing_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.chat_typing_events
  WHERE started_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.chat_typing_events IS 'Typing indicator events (fallback, primary is Firebase Realtime DB)';
COMMENT ON FUNCTION mark_messages_as_read IS 'Mark all messages in chat up to a specific message as read';
COMMENT ON FUNCTION archive_chat IS 'Archive or unarchive a chat for the current user';
COMMENT ON FUNCTION delete_message IS 'Soft delete a message (sender only)';
