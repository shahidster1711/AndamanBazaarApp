import { createPlannerClient, type PlannerSupabaseClient } from "@andaman-planner/supabase-client";
import { createClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

export function createServerPlannerClient(accessToken: string): PlannerSupabaseClient {
  return createPlannerClient({
    supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    accessToken,
  });
}

/**
 * Extracts and validates the user from the Authorization header.
 * Returns null if invalid/missing.
 */
export async function getUserFromRequest(
  request: Request
): Promise<{ userId: string; email: string | null; accessToken: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  return { userId: user.id, email: user.email ?? null, accessToken: token };
}

export function jsonError(code: string, message: string, status: number) {
  return Response.json(
    { apiVersion: "v1" as const, error: { code, message } },
    { status }
  );
}
