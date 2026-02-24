-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create app_role enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "Admins can read all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    listing_id UUID, -- Optional, can link chat to a listing
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0
);

-- Enable RLS on chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policies for chats
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can insert chats" ON chats;
CREATE POLICY "Users can insert chats" ON chats
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
CREATE POLICY "Users can update their own chats" ON chats
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 4. Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = messages.chat_id
            AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in their chats" ON messages;
CREATE POLICY "Users can insert messages in their chats" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chats
            WHERE chats.id = messages.chat_id
            AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
        )
    );

-- 5. Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    listing_id UUID, -- Assuming listings table exists
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can view reports" ON reports;
CREATE POLICY "Admins can view reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- 6. Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL, -- Assuming listings table exists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, listing_id)
);

-- Enable RLS on favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policies for favorites
DROP POLICY IF EXISTS "Users can manage their favorites" ON favorites;
CREATE POLICY "Users can manage their favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);


-- 7. Functions & Triggers

-- handle_new_user: Auto-create a profile on auth (and role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assuming profiles table exists or is created here if needed. 
  -- Existing App.tsx suggests profiles table exists.
  -- But we should ensure it does or insert if not.
  -- The prompt says "Auto-create a profile on auth".
  -- I'll assume profiles table structure from App.tsx (id, email, name, profile_photo_url, phone_number)
  
  INSERT INTO public.profiles (id, email, name, profile_photo_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- increment_listing_views
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Assuming listings table has view_count column
  UPDATE listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- handle_new_message: Update unread counts
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at on chat
  UPDATE chats
  SET updated_at = now()
  WHERE id = new.chat_id;

  -- Increment unread count
  IF (SELECT buyer_id FROM chats WHERE id = new.chat_id) = new.sender_id THEN
    -- Sender is buyer, increment seller unread
    UPDATE chats
    SET seller_unread_count = seller_unread_count + 1
    WHERE id = new.chat_id;
  ELSE
    -- Sender is seller (or other), increment buyer unread
    UPDATE chats
    SET buyer_unread_count = buyer_unread_count + 1
    WHERE id = new.chat_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for handle_new_message
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE PROCEDURE handle_new_message();


-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(role_required app_role)
RETURNS BOOLEAN AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  RETURN user_role = role_required OR user_role = 'admin'; -- Admin has all roles usually? Or strict check?
  -- Prompt says "prevent RLS recursion", usually used in policies.
  -- Strict check: return user_role = role_required;
  -- But usually admin implies moderator.
  -- Let's stick to strict or hierarchy.
  -- For now, simple check.
  
  IF role_required = 'admin' THEN
    RETURN user_role = 'admin';
  ELSIF role_required = 'moderator' THEN
    RETURN user_role = 'admin' OR user_role = 'moderator';
  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage policies for listing-images
-- Ensure bucket exists (cannot create bucket via SQL in standard migrations easily without pg_net or extensions, but we can set policies)
-- We assume bucket 'listing-images' exists or user creates it manually.
-- Policies:
-- Public read
DROP POLICY IF EXISTS "Give public access to listing-images" ON storage.objects;
CREATE POLICY "Give public access to listing-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

-- Authenticated upload
DROP POLICY IF EXISTS "Allow authenticated uploads to listing-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to listing-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

-- Owner update/delete
DROP POLICY IF EXISTS "Allow owner update/delete listing-images" ON storage.objects;
CREATE POLICY "Allow owner update/delete listing-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'listing-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Allow owner delete listing-images" ON storage.objects;
CREATE POLICY "Allow owner delete listing-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'listing-images' AND auth.uid() = owner);
