import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildTripTitle,
  deriveIslandsCovered,
  estimateBudgetRange,
  getDatesBetween,
  getTripDurationDays,
  normalizeIslandName,
} from "@planner/shared/helpers";
import { itineraryDaySchema, tripPreferencesSchema } from "@planner/shared/schemas";
import type { ItineraryActivity, ItineraryDay, TripPreferences, UserIdentity } from "@planner/shared/types";
import { z } from "zod";

const plannerAiOutputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  days: z.array(z.unknown()).min(1).max(21),
  islandsCovered: z.array(z.string().trim().min(1).max(120)).optional(),
  estimatedBudgetRange: z.string().trim().min(1).max(120).optional(),
});

export interface GeneratedPlannerPayload {
  name: string;
  days: ItineraryDay[];
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
}

const primaryModelName = process.env.PLANNER_PRIMARY_MODEL ?? "gemini-1.5-pro";
const secondaryModelName = process.env.PLANNER_SECONDARY_MODEL ?? "gemini-1.5-flash";

const aiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

const extractJsonText = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
};

const parseJsonPayload = (raw: string): unknown => {
  const normalized = extractJsonText(raw);
  return JSON.parse(normalized);
};

const getPaceActivityCount = (pace: TripPreferences["pace"]): number => {
  if (pace === "relaxed") {
    return 2;
  }
  if (pace === "packed") {
    return 4;
  }
  return 3;
};

const buildActivityTemplates = (interestHints: string[]): string[] => {
  const defaults = [
    "Beach leisure and swim session",
    "Local seafood lunch",
    "Sunset viewpoint visit",
    "Snorkeling or scuba experience",
    "Island market walk",
    "Mangrove or glass-bottom boat ride",
    "Heritage and museum stop",
    "Jetty transfer and check-in",
  ];
  const inferred = interestHints.map((hint) => `${hint} experience`);
  return [...inferred, ...defaults];
};

const buildDeterministicActivities = (
  island: string,
  interestHints: string[],
  pace: TripPreferences["pace"],
  dayIndex: number,
): ItineraryActivity[] => {
  const count = getPaceActivityCount(pace);
  const templates = buildActivityTemplates(interestHints);
  const startSlots = ["08:30", "11:30", "14:30", "17:00"];
  const endSlots = ["10:30", "13:00", "16:30", "19:00"];

  return Array.from({ length: count }, (_, itemIndex) => {
    const template = templates[(dayIndex + itemIndex) % templates.length];
    return {
      title: template,
      island,
      startTime: startSlots[itemIndex] ?? "09:00",
      endTime: endSlots[itemIndex] ?? "11:00",
      description: `${template} around ${island} with realistic same-day travel timings.`,
      estimatedCostInr: 1000 + itemIndex * 800,
    };
  });
};

const buildDeterministicDraft = (preferences: TripPreferences) => {
  const dates = getDatesBetween(preferences.startDate, preferences.endDate);
  const preferred = preferences.preferredIslands.map(normalizeIslandName).filter(Boolean);
  const sequence = preferred.length > 0 ? preferred : ["Port Blair", "Havelock Island", "Neil Island"];
  const interestHints = preferences.interests.length > 0 ? preferences.interests : ["Beach"];

  const days: ItineraryDay[] = dates.map((date, index) => {
    const island = sequence[index % sequence.length];
    const prevIsland = index > 0 ? sequence[(index - 1) % sequence.length] : null;
    const transfers =
      prevIsland && prevIsland !== island
        ? [`Morning inter-island ferry from ${prevIsland} to ${island}`]
        : [];

    return {
      dayNumber: index + 1,
      date,
      island,
      summary: `Balanced day in ${island} with time for transfers and buffer.`,
      activities: buildDeterministicActivities(island, interestHints, preferences.pace, index),
      stayRecommendation: `${island} central stay near jetty for easier movement`,
      transfers,
    };
  });

  return {
    name: buildTripTitle(preferences, deriveIslandsCovered(days), dates.length),
    days,
    islandsCovered: deriveIslandsCovered(days),
    estimatedBudgetRange: estimateBudgetRange(preferences, dates.length),
  };
};

const normalizeAiOutput = (
  raw: z.infer<typeof plannerAiOutputSchema>,
  preferences: TripPreferences,
  modelVersion: string,
): GeneratedPlannerPayload => {
  const dates = getDatesBetween(preferences.startDate, preferences.endDate);
  const deterministicFallback = buildDeterministicDraft(preferences);
  const preferredFallback = preferences.preferredIslands.map(normalizeIslandName).filter(Boolean);
  const fallbackSequence =
    preferredFallback.length > 0 ? preferredFallback : ["Port Blair", "Havelock Island", "Neil Island"];

  const normalizedDays: ItineraryDay[] = dates.map((date, index) => {
    const candidate = raw.days[index] as Partial<ItineraryDay> | undefined;
    const fallback = deterministicFallback.days[index];
    const island = candidate?.island?.trim()
      ? normalizeIslandName(candidate.island)
      : fallbackSequence[index % fallbackSequence.length];

    return itineraryDaySchema.parse({
      dayNumber: index + 1,
      date,
      island,
      summary: candidate?.summary ?? fallback.summary,
      activities: candidate?.activities ?? fallback.activities,
      stayRecommendation: candidate?.stayRecommendation ?? fallback.stayRecommendation,
      transfers: candidate?.transfers ?? fallback.transfers,
    });
  });

  const islandsCovered = raw.islandsCovered?.length
    ? raw.islandsCovered.map(normalizeIslandName)
    : deriveIslandsCovered(normalizedDays);
  const estimatedBudgetRange =
    raw.estimatedBudgetRange ?? estimateBudgetRange(preferences, getTripDurationDays(preferences.startDate, preferences.endDate));
  const name = raw.name?.trim().length
    ? raw.name
    : buildTripTitle(preferences, islandsCovered, normalizedDays.length);

  return {
    name,
    days: normalizedDays,
    islandsCovered,
    estimatedBudgetRange,
    modelVersion,
  };
};

const primaryPrompt = (preferences: TripPreferences, user: UserIdentity): string =>
  [
    "You are an expert Andaman itinerary architect.",
    "Return strict JSON only. No markdown, no commentary.",
    "The JSON shape must match this TypeScript interface:",
    "{ name?: string; days: Array<{ dayNumber: number; date: YYYY-MM-DD; island: string; summary: string; activities: Array<{ title: string; island: string; startTime: HH:mm; endTime: HH:mm; description: string; estimatedCostInr: number | null }>; stayRecommendation: string; transfers: string[] }>; islandsCovered?: string[]; estimatedBudgetRange?: string; }",
    "Hard constraints:",
    "- Trip dates must align with requested date range.",
    "- Andaman-specific realism: practical jetty/ferry movement, no impossible same-slot island hops.",
    "- Keep transfer buffers and avoid overstuffed days.",
    "- Include activity timing windows in HH:mm.",
    "",
    `User: ${JSON.stringify(user)}`,
    `Preferences: ${JSON.stringify(preferences)}`,
  ].join("\n");

const repairPrompt = (
  preferences: TripPreferences,
  invalidJson: unknown,
  validationError: string,
): string =>
  [
    "Repair and normalize itinerary JSON.",
    "Return valid strict JSON only with same schema used in the previous prompt.",
    "Also derive missing fields: name, islandsCovered, estimatedBudgetRange.",
    "Fix all schema and Andaman realism issues.",
    `Validation errors: ${validationError}`,
    `Trip preferences: ${JSON.stringify(preferences)}`,
    `Invalid JSON: ${JSON.stringify(invalidJson)}`,
  ].join("\n");

const runModel = async (modelName: string, prompt: string): Promise<string> => {
  if (!aiApiKey) {
    throw new Error("AI key is not configured");
  }
  const aiClient = new GoogleGenerativeAI(aiApiKey);
  const model = aiClient.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  if (!responseText?.trim()) {
    throw new Error(`Model ${modelName} returned empty content`);
  }
  return responseText;
};

export const generateItineraryWithAi = async (
  preferencesInput: TripPreferences,
  user: UserIdentity,
): Promise<GeneratedPlannerPayload> => {
  const preferences = tripPreferencesSchema.parse(preferencesInput);

  if (!aiApiKey) {
    const fallback = buildDeterministicDraft(preferences);
    return {
      ...fallback,
      modelVersion: "deterministic-fallback",
    };
  }

  let rawPrimaryPayload: unknown;
  try {
    const primaryRawText = await runModel(primaryModelName, primaryPrompt(preferences, user));
    rawPrimaryPayload = parseJsonPayload(primaryRawText);
    const validatedPrimary = plannerAiOutputSchema.parse(rawPrimaryPayload);
    return normalizeAiOutput(validatedPrimary, preferences, primaryModelName);
  } catch (primaryError) {
    try {
      const repairRawText = await runModel(
        secondaryModelName,
        repairPrompt(
          preferences,
          rawPrimaryPayload ?? null,
          primaryError instanceof Error ? primaryError.message : "Unknown validation failure",
        ),
      );
      const repairedPayload = parseJsonPayload(repairRawText);
      const validatedRepair = plannerAiOutputSchema.parse(repairedPayload);
      return normalizeAiOutput(validatedRepair, preferences, `${primaryModelName}|repair:${secondaryModelName}`);
    } catch {
      const fallback = buildDeterministicDraft(preferences);
      return {
        ...fallback,
        modelVersion: `${primaryModelName}|repair:${secondaryModelName}|fallback`,
      };
    }
  }
};
