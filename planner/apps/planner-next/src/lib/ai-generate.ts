import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type TripPreferences,
  type ItineraryDay,
  itineraryDaysSchema,
  daysBetween,
  estimateBudgetRange,
} from "@andaman-planner/shared";

const MODEL_PRIMARY = "gemini-1.5-pro";
const MODEL_REPAIR = "gemini-1.5-flash";

function getAIClient() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Missing GOOGLE_AI_API_KEY");
  return new GoogleGenerativeAI(key);
}

function buildSystemPrompt(prefs: TripPreferences, numDays: number): string {
  return `You are an expert Andaman Islands travel planner. Generate a detailed ${numDays}-day itinerary as a JSON array.

TRIP DETAILS:
- Dates: ${prefs.startDate} to ${prefs.endDate} (${numDays} days)
- Travelers: ${prefs.travelersCount}
- Budget: ${prefs.budgetLevel}
- Pace: ${prefs.pace}
- Interests: ${prefs.interests.join(", ")}
- Preferred islands: ${prefs.preferredIslands.length > 0 ? prefs.preferredIslands.join(", ") : "No preference (suggest best options)"}
${prefs.notes ? `- Special notes: ${prefs.notes}` : ""}

CONSTRAINTS:
- Port Blair is the only entry/exit point (Veer Savarkar Airport).
- Day 1 must start with arrival at Port Blair.
- Last day should account for departure.
- Ferry travel between islands takes 1.5-4 hours; plan realistically.
- Havelock Island ferries run ~2-3 times daily; book in advance.
- Monsoon season (May-Sep) limits water activities.
- Respect permit requirements for restricted areas.
- Budget level affects accommodation and activity recommendations.

OUTPUT FORMAT — respond ONLY with a JSON array (no markdown, no explanation):
[
  {
    "dayNumber": 1,
    "date": "YYYY-MM-DD",
    "title": "Short day title",
    "island": "Island name",
    "activities": [
      {
        "time": "HH:MM",
        "title": "Activity name",
        "description": "Brief description",
        "location": "Specific location",
        "duration": "X hours",
        "cost": "₹XXX per person or Free",
        "tips": "Optional tip or null"
      }
    ],
    "meals": {
      "breakfast": "Restaurant/hotel name and cuisine type or null",
      "lunch": "Restaurant name or null",
      "dinner": "Restaurant name or null"
    },
    "transportNotes": "How to get around today or null",
    "accommodationNotes": "Where to stay or null"
  }
]

Generate exactly ${numDays} day objects. Each day must have 3-6 activities depending on the pace (${prefs.pace}).`;
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const bracketStart = text.indexOf("[");
  const bracketEnd = text.lastIndexOf("]");
  if (bracketStart !== -1 && bracketEnd > bracketStart) {
    return text.slice(bracketStart, bracketEnd + 1);
  }

  return text.trim();
}

async function repairJSON(raw: string, validationErrors: string): Promise<string> {
  const ai = getAIClient();
  const model = ai.getGenerativeModel({ model: MODEL_REPAIR });

  const prompt = `The following JSON failed validation with these errors:
${validationErrors}

Fix the JSON and return ONLY the corrected JSON array, nothing else.

JSON to fix:
${raw}`;

  const result = await model.generateContent(prompt);
  return extractJSON(result.response.text());
}

export interface GenerationResult {
  days: ItineraryDay[];
  name: string;
  islandsCovered: string[];
  estimatedBudgetRange: string;
  modelVersion: string;
}

export async function generateItinerary(
  prefs: TripPreferences
): Promise<GenerationResult> {
  const ai = getAIClient();
  const numDays = daysBetween(prefs.startDate, prefs.endDate);
  const systemPrompt = buildSystemPrompt(prefs, numDays);

  const model = ai.getGenerativeModel({
    model: MODEL_PRIMARY,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const result = await model.generateContent(systemPrompt);
  let rawJSON = extractJSON(result.response.text());

  let parsed = itineraryDaysSchema.safeParse(JSON.parse(rawJSON));

  if (!parsed.success) {
    const errMsg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");

    const repairedJSON = await repairJSON(rawJSON, errMsg);
    parsed = itineraryDaysSchema.safeParse(JSON.parse(repairedJSON));

    if (!parsed.success) {
      throw new Error(
        `Itinerary validation failed after repair: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
  }

  const days = parsed.data;
  const islandsCovered = [...new Set(days.map((d) => d.island))];

  const titleModel = ai.getGenerativeModel({ model: MODEL_REPAIR });
  const titleResult = await titleModel.generateContent(
    `Generate a short, catchy trip name (max 8 words) for a ${numDays}-day Andaman trip visiting ${islandsCovered.join(", ")} with interests: ${prefs.interests.join(", ")}. Budget: ${prefs.budgetLevel}. Return ONLY the title text, nothing else.`
  );
  const name = titleResult.response.text().trim().replace(/^["']|["']$/g, "");

  return {
    days,
    name: name || `${numDays}-Day Andaman Adventure`,
    islandsCovered,
    estimatedBudgetRange: estimateBudgetRange(numDays, prefs.travelersCount, prefs.budgetLevel),
    modelVersion: MODEL_PRIMARY,
  };
}
