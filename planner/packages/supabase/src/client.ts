/**
 * Supabase client factory for Andaman Planner Pro.
 *
 * Usage (client-side / Vite / browser):
 *   import { createPlannerBrowserClient } from "@andaman-planner/supabase"
 *
 * Usage (Next.js server components / Route handlers):
 *   import { createPlannerServerClient } from "@andaman-planner/supabase"
 *
 * Both return a SupabaseClient<Database> with full type safety.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types/database.types"

export type { Database }
export type PlannerSupabaseClient = SupabaseClient<Database>

// ----------------------------------------------------------------
// Environment helpers (works in both Vite and Next.js)
// ----------------------------------------------------------------

function getEnv(viteName: string, nextName: string): string {
  // Next.js exposes NEXT_PUBLIC_ vars, Vite exposes VITE_ vars
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[nextName] ?? process.env[viteName]
    if (v) return v
  }
  // Vite-style import.meta.env (build-time)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (typeof import.meta !== "undefined" ? (import.meta as any).env : undefined) as
    | Record<string, string>
    | undefined

  return meta?.[viteName] ?? ""
}

export function getSupabaseUrl(): string {
  return getEnv("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
}

export function getSupabaseAnonKey(): string {
  return getEnv("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

// ----------------------------------------------------------------
// Browser / client-side client (uses anon key, session from storage)
// ----------------------------------------------------------------

let _browserClient: PlannerSupabaseClient | null = null

/**
 * Returns a singleton browser-side Supabase client with Database types.
 * Use this inside React components and client-side hooks.
 *
 * It picks up the existing AndamanBazaar session automatically because
 * both apps share the same Supabase URL + anon key.
 */
export function createPlannerBrowserClient(): PlannerSupabaseClient {
  if (_browserClient) return _browserClient

  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  if (!url || !key) {
    console.warn(
      "[andaman-planner/supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
        "The client will be initialised with placeholder values."
    )
  }

  _browserClient = createClient<Database>(
    url || "https://placeholder.supabase.co",
    key || "placeholder-anon-key",
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "andaman-bazaar-auth", // shared with AndamanBazaar main app
      },
    }
  )
  return _browserClient
}

// ----------------------------------------------------------------
// Server-side client factory (Next.js Route Handlers, Server Actions)
// ----------------------------------------------------------------

/**
 * Creates a NEW server-side Supabase client that reads the user's
 * session from an Authorization header (Bearer JWT) or from cookies.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in env for service-role
 * operations (rate limiting writes, etc.).
 *
 * @param accessToken  JWT from the incoming request's Authorization header.
 *                     When provided the client acts as that user (RLS active).
 * @param useServiceRole  Pass true to bypass RLS (e.g. write rate_limit rows).
 */
export function createPlannerServerClient(
  accessToken?: string,
  useServiceRole = false
): PlannerSupabaseClient {
  const url = getEnv("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = getEnv("VITE_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const serviceKey =
    typeof process !== "undefined" ? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "" : ""

  const key = useServiceRole && serviceKey ? serviceKey : anonKey

  const client = createClient<Database>(
    url || "https://placeholder.supabase.co",
    key || "placeholder-anon-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: accessToken
        ? {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        : undefined,
    }
  )

  return client
}
