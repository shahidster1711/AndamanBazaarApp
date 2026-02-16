
export interface Profile {
  id: string;
  phone_number?: string;
  name?: string;
  email?: string;
  profile_photo_url?: string;
  city?: string;
  area?: string;
  is_location_verified: boolean;
  total_listings: number;
  successful_sales: number;
  trust_level: 'newbie' | 'verified' | 'legend';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  description?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

export interface Listing {
  id: string;
  user_id: string;
  category_id: string;
  subcategory_id: string;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like_new' | 'good' | 'fair';
  city: string;
  area: string;
  landmark?: string;
  status: 'draft' | 'active' | 'sold' | 'expired' | 'deleted';
  is_featured: boolean;
  views_count: number;
  favorites_count: number;
  created_at: string;
  images?: ListingImage[];
  seller?: Profile;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface Chat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_at: string;
  buyer_unread_count: number;
  seller_unread_count: number;
  listing?: Listing;
  other_party?: Profile;
  // Fix: Added buyer and seller properties to satisfy Supabase aliased joins
  buyer?: Profile;
  seller?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_text: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}