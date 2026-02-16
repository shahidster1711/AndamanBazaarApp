
import { createClient } from '@supabase/supabase-js';

// Environment variable resolution with provided defaults for AndamanBazaar
const supabaseUrl = 'https://msxeqzceqjatoaluempo.supabase.co';
const supabaseAnonKey = 'sb_publishable__qYA3APlwn1QqTPhpuS9Mw_P0v91JZZ';

// Export a function to check if the app is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20;
};

// Initialize the client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
