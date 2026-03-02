import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TripPreferences } from "@andaman-planner/shared";
import {
  aiItineraryOutputSchema,
  type AiItineraryOutput,
} from "@andaman-planner/shared";
import { dayCount, dateRange, budgetRangeLabel } from "@andaman-planner/shared";
import { getEnv } from "./env";

const MODEL_PRIMARY = "gemini-1.5-flash";
const MODEL_REPAIR = "gemini-1.5-flash";

function buildPrompt(prefs: TripPreferences): string {
  const days = dayCount(prefs.startDate, prefs.endDate);
  const dates = dateRange(prefs.startDate, prefs.endDate);

  return `You are an expert Andaman Islands travel planner. Generate a detailed ${days}-day itinerary as strict JSON.

TRIP DETAILS:
- Dates: ${prefs.startDate} to ${prefs.endDate} (${days} days)
- Travelers: ${prefs.travelersCount}
- Budget: ${prefs.budgetLevel} (${budgetRangeLabel(prefs.budgetLevel)})
- Pace: ${prefs.pace}
- Interests: ${prefs.interests.join(", ")}
${prefs.preferredIslands.length > 0 ? `- Preferred islands: ${prefs.preferredIslands.join(", ")}` : "- Islands: your choice of the best options"}
${prefs.notes ? `- Special notes: ${prefs.notes}` : ""}

CONSTRAINTS:
- Only Andaman & Nicobar Islands destinations.
- Realistic island hops (Port Blair is the arrival hub; ferries to Havelock ~2hrs, Neil ~1.5hrs).
- Government ferry schedules: typically morning departures. Private ferries also available.
- Respect rainy season (May–Sept) if trip falls in that period.
- Day 1 should start from Port Blair (arrival).
- Last day should account for departure logistics.

OUTPUT JSON SCHEMA (strict):
{
  "name": "string - creative trip title",
  "days": [
    {
      "dayNumber": number,
      "date": "YYYY-MM-DD",
      "island": "string",
      "theme": "string - day theme",
      "activities": [
        {
          "time": "HH:MM",
          "title": "string",
          "description": "string",
          "location": "string - specific place name",
          "duration": "string - e.g. 2 hours",
          "estimatedCost": "string or null - e.g. ₹500/person",
          "category": "string - sightseeing|water-sports|dining|transport|relaxation|adventure|culture",
          "tips": "string or null"
        }
      ],
      "meals": {
        "breakfast": "string or null - restaurant/place recommendation",
        "lunch": "string or null",
        "dinner": "string or null"
      },
      "accommodation": "string or null - hotel/resort suggestion",
      "travelNotes": "string or null - ferry/transport info"
    }
  ],
  "islandsCovered": ["string"],
  "estimatedBudgetRange": "string - total budget range for the trip"
}

DATES FOR EACH DAY: ${JSON.stringify(dates)}

Return ONLY valid JSON. No markdown, no code fences, no explanation.`;
}

function extractJson(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1]!.trim();
  return text;
}

async function callGemini(prompt: string, model: string): Promise<string> {
  const env = getEnv();
  if (!env.googleAiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(env.googleAiKey);
  const genModel = genAI.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  return result.response.text();
}

async function repairJson(
  rawJson: string,
  errors: string
): Promise<string> {
  const repairPrompt = `The following JSON has validation errors. Fix them and return ONLY the corrected JSON.

ERRORS:
${errors}

JSON TO FIX:
${rawJson}

Return ONLY valid JSON. No explanation.`;

  return callGemini(repairPrompt, MODEL_REPAIR);
}

export async function generateItinerary(
  preferences: TripPreferences
): Promise<{ output: AiItineraryOutput; modelVersion: string }> {
  const prompt = buildPrompt(preferences);

  let rawText = await callGemini(prompt, MODEL_PRIMARY);
  let jsonText = extractJson(rawText);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = JSON.parse(jsonText);
      const validated = aiItineraryOutputSchema.parse(parsed);
      return { output: validated, modelVersion: MODEL_PRIMARY };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (attempt < 1) {
        rawText = await repairJson(jsonText, errMsg);
        jsonText = extractJson(rawText);
      } else {
        throw new Error(
          `AI output failed validation after repair attempt: ${errMsg}`
        );
      }
    }
  }

  throw new Error("Unreachable: generation loop exited without result");
}
