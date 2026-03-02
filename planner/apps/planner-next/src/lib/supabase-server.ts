import { createClient } from "@supabase/supabase-js";
import type { Database } from "@andaman-planner/supabase-client";
import { getEnv } from "./env";

/**
 * Create a Supabase client for server-side use in Next.js route handlers.
 * Passes the user's auth token from the Authorization header.
 */
export function createServerClient(authHeader: string | null) {
  const env = getEnv();
  const token = authHeader?.replace("Bearer ", "");

  return createClient<Database, "planner">(env.supabaseUrl, env.supabaseAnonKey, {
    db: { schema: "planner" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Service-role client that bypasses RLS. Use for rate-limit checks.
 */
export function createAdminClient() {
  const env = getEnv();
  return createClient<Database, "planner">(env.supabaseUrl, env.supabaseServiceRoleKey, {
    db: { schema: "planner" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Extract and verify the authenticated user from request headers.
 * Returns the user object or null.
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const env = getEnv();
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
