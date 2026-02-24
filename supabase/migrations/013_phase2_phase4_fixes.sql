-- Phase 2 fixes: normalize chat/profile triggers, role helper, storage bucket/policies

-- 1) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(role_required public.app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (role = role_required OR role = 'admin')
  );
$$;

-- 2) Reports status compatibility (allow reviewed + investigating)
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'investigating'::text, 'resolved'::text, 'dismissed'::text]));

-- 3) Ensure handle_new_user creates profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone_number, name, profile_photo_url)
  VALUES (
    new.id,
    new.email,
    new.phone,
    COALESCE(new.raw_user_meta_data->>'name', 'Island User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Listing views increment (matches frontend rpc call)
DROP FUNCTION IF EXISTS public.increment_listing_views(uuid);

CREATE FUNCTION public.increment_listing_views(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

-- 5) Chat unread counters + last message metadata
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_seller_id uuid;
BEGIN
  SELECT buyer_id, seller_id
  INTO v_buyer_id, v_seller_id
  FROM public.chats
  WHERE id = new.chat_id;

  UPDATE public.chats
  SET
    last_message = new.message_text,
    last_message_at = COALESCE(new.created_at, now()),
    buyer_unread_count = CASE WHEN new.sender_id = v_seller_id THEN buyer_unread_count + 1 ELSE buyer_unread_count END,
    seller_unread_count = CASE WHEN new.sender_id = v_buyer_id THEN seller_unread_count + 1 ELSE seller_unread_count END
  WHERE id = new.chat_id;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 6) Storage bucket + policies for listing-images (keep existing "listings" bucket too)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Give public access to listing-images" ON storage.objects;
CREATE POLICY "Give public access to listing-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Allow authenticated uploads to listing-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to listing-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow owner update listing-images" ON storage.objects;
CREATE POLICY "Allow owner update listing-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'listing-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner delete listing-images" ON storage.objects;
CREATE POLICY "Allow owner delete listing-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'listing-images' AND auth.uid() = owner);

-- 7) Ensure realtime publication includes chats/messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND n.nspname = 'public'
      AND c.relname = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND n.nspname = 'public'
      AND c.relname = 'chats'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
  END IF;
END $$;
