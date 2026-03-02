import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type PlannerSupabaseClient = SupabaseClient<Database, "planner">;

export interface CreateClientOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken?: string;
}

/**
 * Creates a typed Supabase client scoped to the `planner` schema.
 * When an accessToken is provided (server-side usage), it is injected
 * into the client headers so RLS evaluates against that user.
 */
export function createPlannerClient(opts: CreateClientOptions): PlannerSupabaseClient {
  const headers: Record<string, string> = {};
  if (opts.accessToken) {
    headers["Authorization"] = `Bearer ${opts.accessToken}`;
  }

  return createSupabaseClient<Database, "planner">(
    opts.supabaseUrl,
    opts.supabaseAnonKey,
    {
      db: { schema: "planner" },
      global: { headers },
      auth: {
        autoRefreshToken: !opts.accessToken,
        persistSession: !opts.accessToken,
      },
    }
  );
}

/**
 * Creates a browser-side Supabase client that shares the existing
 * AndamanBazaar session (cookies/localStorage).
 */
export function createBrowserPlannerClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): PlannerSupabaseClient {
  return createSupabaseClient<Database, "planner">(supabaseUrl, supabaseAnonKey, {
    db: { schema: "planner" },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}
