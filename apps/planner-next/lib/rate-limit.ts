import { itineraryRepo } from "@planner/supabase";

export interface GenerationRateLimitStatus {
  allowed: boolean;
  usedInWindow: number;
  maxPerHour: number;
  retryAfterSeconds: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export const GENERATION_LIMIT_PER_HOUR = 5;

export const checkGenerationRateLimit = async (
  client: Parameters<typeof itineraryRepo.countGeneratedSince>[0],
  userId: string,
): Promise<GenerationRateLimitStatus> => {
  const now = Date.now();
  const since = new Date(now - ONE_HOUR_MS).toISOString();
  const usedInWindow = await itineraryRepo.countGeneratedSince(client, userId, since);

  return {
    allowed: usedInWindow < GENERATION_LIMIT_PER_HOUR,
    usedInWindow,
    maxPerHour: GENERATION_LIMIT_PER_HOUR,
    retryAfterSeconds: 60 * 60,
  };
};
