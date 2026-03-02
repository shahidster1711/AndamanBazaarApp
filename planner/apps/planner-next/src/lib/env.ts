function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export function getEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    googleAiKey: process.env.GOOGLE_AI_API_KEY ?? "",
    openaiKey: process.env.OPENAI_API_KEY ?? "",
    rateLimitPerHour: Number(process.env.RATE_LIMIT_GENERATIONS_PER_HOUR ?? "5"),
  };
}
