import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type TypedSupabaseClient = SupabaseClient<Database, "planner">;

/**
 * Create a typed Supabase client scoped to the planner schema.
 * Works in both browser (Vite) and server (Next.js) contexts.
 */
export function createPlannerClient(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    accessToken?: string;
    cookieHeader?: string;
  }
): TypedSupabaseClient {
  return createClient<Database, "planner">(supabaseUrl, supabaseKey, {
    db: { schema: "planner" },
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
    },
    global: {
      headers: options?.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {},
    },
  });
}

/**
 * Create a Supabase client using the service role key (server-side only).
 * Bypasses RLS — use only for admin operations.
 */
export function createServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string
): TypedSupabaseClient {
  return createClient<Database, "planner">(supabaseUrl, serviceRoleKey, {
    db: { schema: "planner" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
