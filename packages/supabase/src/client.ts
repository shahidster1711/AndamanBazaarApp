import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export type CookieMethods = {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: { path?: string; maxAge?: number }) => void;
  remove: (name: string, options?: { path?: string }) => void;
};

export function createPlannerBrowserClient(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}): TypedSupabaseClient {
  return createClient<Database>(params.supabaseUrl, params.supabaseAnonKey);
}

export function createPlannerClientWithAccessToken(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
}): TypedSupabaseClient {
  return createClient<Database>(params.supabaseUrl, params.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    },
  });
}

/**
 * Framework-agnostic server client using cookie get/set/remove.
 * Next.js (App Router) can adapt `cookies()` to this shape.
 */
export function createPlannerServerClient(params: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookies: CookieMethods;
}): TypedSupabaseClient {
  return createServerClient<Database>(params.supabaseUrl, params.supabaseAnonKey, {
    cookies: {
      get: (name) => params.cookies.get(name),
      set: (name, value, options) => params.cookies.set(name, value, options),
      remove: (name, options) => params.cookies.remove(name, options),
    },
  });
}

