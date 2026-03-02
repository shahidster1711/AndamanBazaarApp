import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface SupabaseClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export type PlannerSupabaseClient = SupabaseClient<Database>;

export const isSupabaseRuntimeConfigValid = (config: SupabaseClientConfig): boolean =>
  config.supabaseUrl.startsWith("https://") && config.supabaseAnonKey.length > 20;

export const createPlannerBrowserClient = (config: SupabaseClientConfig): PlannerSupabaseClient =>
  createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

export const createPlannerServerUserClient = (
  config: SupabaseClientConfig,
  accessToken: string,
): PlannerSupabaseClient =>
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
