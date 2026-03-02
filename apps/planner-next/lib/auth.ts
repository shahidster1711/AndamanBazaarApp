import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { UserIdentity } from "@planner/shared/types";
import type { SupabaseClientConfig } from "@planner/supabase/clients";
import type { Database } from "@planner/supabase/database.types";

type AuthSupabaseClient = ReturnType<typeof createClient<Database>>;

const apiError = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json(
    {
      apiVersion: "v1",
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );

const readSupabaseConfig = (): SupabaseClientConfig | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
};

const extractBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
};

const createCookieScopedClient = (config: SupabaseClientConfig): AuthSupabaseClient => {
  const cookieStore = cookies();

  return createServerClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Route handlers can be read-only depending on runtime context.
        }
      },
    },
  });
};

const createBearerScopedClient = (
  config: SupabaseClientConfig,
  accessToken: string,
): AuthSupabaseClient =>
  createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

export interface AuthenticatedPlannerRequest {
  user: UserIdentity;
  supabase: AuthSupabaseClient;
}

export const requireAuthenticatedPlannerRequest = async (
  request: NextRequest,
): Promise<AuthenticatedPlannerRequest | NextResponse> => {
  const config = readSupabaseConfig();

  if (!config) {
    return apiError(
      500,
      "missing_supabase_env",
      "Supabase env is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }

  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const supabase = createBearerScopedClient(config, bearerToken);
    const { data, error } = await supabase.auth.getUser(bearerToken);

    if (error || !data.user) {
      return apiError(401, "unauthorized", "Authentication required.");
    }

    return {
      user: {
        userId: data.user.id,
        email: data.user.email ?? null,
      },
      supabase,
    };
  }

  const supabase = createCookieScopedClient(config);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return apiError(401, "unauthorized", "Authentication required.");
  }

  return {
    user: {
      userId: data.user.id,
      email: data.user.email ?? null,
    },
    supabase,
  };
};

export const plannerApiError = apiError;
