import { cookies } from 'next/headers';
import { createPlannerClientWithAccessToken, createPlannerServerClient } from '@andamanbazaar/planner-supabase';

export function getSupabaseConfig():
  | { supabaseUrl: string; supabaseAnonKey: string }
  | { error: string } {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Missing env: SUPABASE_URL and/or SUPABASE_ANON_KEY' };
  }
  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseAuthedClient(req: Request) {
  const cfg = getSupabaseConfig();
  if ('error' in cfg) {
    return { supabase: null as any, accessToken: null as string | null, configError: cfg.error };
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (token) {
    return {
      supabase: createPlannerClientWithAccessToken({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        accessToken: token,
      }),
      accessToken: token,
      configError: null as string | null,
    };
  }

  const cookieStore = cookies();
  return {
    supabase: createPlannerServerClient({
      supabaseUrl: cfg.supabaseUrl,
      supabaseAnonKey: cfg.supabaseAnonKey,
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set({
            name,
            value,
            path: options?.path ?? '/',
            maxAge: options?.maxAge,
          });
        },
        remove: (name, options) => {
          cookieStore.set({
            name,
            value: '',
            path: options?.path ?? '/',
            maxAge: 0,
          });
        },
      },
    }),
    accessToken: null as string | null,
    configError: null as string | null,
  };
}

