
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone_number TEXT,
  profile_photo_url TEXT,
  city TEXT DEFAULT 'Port Blair',
  area TEXT,
  is_location_verified BOOLEAN DEFAULT false,
  trust_level TEXT DEFAULT 'newbie' CHECK (trust_level IN ('newbie', 'verified', 'legend')),
  total_listings INTEGER DEFAULT 0,
  successful_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LISTINGS TABLE
CREATE TABLE public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  condition TEXT DEFAULT 'good',
  city TEXT DEFAULT 'Port Blair',
  area TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'deleted')),
  views_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LISTING IMAGES TABLE
CREATE TABLE public.listing_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FAVORITES TABLE
CREATE TABLE public.favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- 5. CHATS TABLE
CREATE TABLE public.chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id UUID,
  seller_id UUID,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  buyer_unread_count INTEGER DEFAULT 0,
  seller_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chats_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id),
  CONSTRAINT chats_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
);

-- 6. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  message_text TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. REPORTS TABLE
CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Images are viewable by everyone" ON public.listing_images FOR SELECT USING (true);
CREATE POLICY "Users can insert images for own listings" ON public.listing_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete images from own listings" ON public.listing_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update their own chats" ON public.chats FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Users can send messages in their chats" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.chats WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- FUNCTIONS & TRIGGERS

-- Handle New User Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone_number, name, profile_photo_url)
  VALUES (
    new.id,
    new.email,
    new.phone,
    COALESCE(new.raw_user_meta_data->>'name', 'Island User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atomic View Increment Function
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update chat metadata on new message
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger AS $$
DECLARE
  v_sender_id UUID;
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  -- Get chat participants
  SELECT buyer_id, seller_id INTO v_buyer_id, v_seller_id 
  FROM public.chats WHERE id = new.chat_id;

  -- Update last message details
  UPDATE public.chats
  SET 
    last_message = new.message_text,
    last_message_at = new.created_at,
    -- Increment unread count for the recipient
    buyer_unread_count = CASE WHEN new.sender_id = v_seller_id THEN buyer_unread_count + 1 ELSE buyer_unread_count END,
    seller_unread_count = CASE WHEN new.sender_id = v_buyer_id THEN seller_unread_count + 1 ELSE seller_unread_count END
  WHERE id = new.chat_id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();
