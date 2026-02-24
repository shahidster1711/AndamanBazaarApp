
import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Export a function to check if the app is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl?.startsWith('https://') && supabaseAnonKey?.length > 20;
};

// Initialize the client with fallbacks to prevent crash on import if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
