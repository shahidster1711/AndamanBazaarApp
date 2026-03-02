/**
 * AI prompt engineering for Andaman itinerary generation.
 */

import type { TripPreferences } from "@andaman-planner/shared"
import { tripDays, dateRange, budgetLevelLabel, paceLevelLabel, activitiesPerDay } from "@andaman-planner/shared"

export function buildItineraryPrompt(preferences: TripPreferences): string {
  const days = tripDays(preferences.startDate, preferences.endDate)
  const dates = dateRange(preferences.startDate, preferences.endDate)
  const { min: minAct, max: maxAct } = activitiesPerDay(preferences.pace)

  const islandHints =
    preferences.preferredIslands.length > 0
      ? `The user prefers these islands: ${preferences.preferredIslands.join(", ")}.`
      : "Choose the best islands based on interests and duration."

  return `You are an expert Andaman & Nicobar Islands travel planner AI. Generate a realistic, detailed JSON itinerary.

TRIP DETAILS:
- Duration: ${days} days (${preferences.startDate} to ${preferences.endDate})
- Dates: ${dates.join(", ")}
- Travelers: ${preferences.travelersCount} person(s)
- Budget: ${budgetLevelLabel(preferences.budgetLevel)}
- Pace: ${paceLevelLabel(preferences.pace)} (${minAct}–${maxAct} activities per day)
- Interests: ${preferences.interests.join(", ")}
- Island preference: ${islandHints}
- Notes: ${preferences.notes ?? "None"}

ANDAMAN CONSTRAINTS (MANDATORY):
1. Port Blair is the entry/exit point (via airport or ship). Day 1 usually starts here.
2. Havelock (Swaraj Dweep) is the most popular island — reachable by ferry (2–2.5 hrs from Port Blair).
3. Neil Island (Shaheed Dweep) is small and peaceful — ferry from Havelock (30–45 min) or Port Blair.
4. Baratang: known for mud volcanoes and limestone caves; requires a permit.
5. Diglipur is far north — only worth visiting on trips of 7+ days.
6. Cellular Jail in Port Blair: book the Light & Sound show in advance.
7. Radhanagar Beach (Havelock): one of Asia's best beaches — include for beach lovers.
8. Budget level affects accommodation and activity choices:
   - budget: government guesthouses, dorm stays, local ferries
   - midrange: 3-star hotels, private ferries (Makruzz/Green Ocean)
   - premium: luxury resorts (Barefoot at Havelock, Taj Exotica), seaplanes, premium dive packages
9. Water sports are seasonal: best Oct–May. Avoid open sea during monsoon (Jun–Sep).
10. Inter-island ferries run 1–2 times daily; always plan transport the day before.
11. Each day must be LOGISTICALLY POSSIBLE (no impossible island jumps in one day).
12. Keep estimatedDailyCost in INR, realistic for the chosen budget level.

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no explanation, no code blocks).
The JSON must match this exact schema:

{
  "name": "Catchy trip name (e.g. 'Havelock & Neil Island Dream Escape')",
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "island": "Island name",
      "theme": "Short theme for the day",
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity title",
          "description": "2-3 sentence description",
          "location": "Specific location name",
          "durationMinutes": 90,
          "estimatedCost": 500,
          "category": "sightseeing|water_sport|food|travel|accommodation|leisure",
          "tips": ["Practical tip 1", "Practical tip 2"]
        }
      ],
      "accommodation": "Hotel/resort name or type",
      "mealRecommendations": ["Restaurant or dish recommendation"],
      "transportNotes": "How to get around today",
      "estimatedDailyCost": 2500
    }
  ],
  "islandsCovered": ["Port Blair", "Havelock Island (Swaraj Dweep)"],
  "estimatedBudgetRange": "₹X,XXX – ₹X,XXX per person"
}

Generate exactly ${days} days. Start on ${preferences.startDate}. End on ${preferences.endDate}.
Be specific about locations, times, and costs. Make the trip feel real and exciting!`
}

export function buildRepairPrompt(brokenJson: string, validationErrors: string): string {
  return `You are a JSON repair specialist. The following JSON failed validation.

VALIDATION ERRORS:
${validationErrors}

BROKEN JSON:
${brokenJson}

Fix ALL validation errors and return ONLY valid JSON that matches the schema exactly.
Do not add explanations. Return only the fixed JSON object.
Ensure:
- All "time" fields are "HH:MM" format
- All "date" fields are "YYYY-MM-DD" format
- All "category" values are one of: sightseeing, water_sport, food, travel, accommodation, leisure
- All "estimatedCost" and "estimatedDailyCost" are numbers (not strings)
- "durationMinutes" is an integer
- "islandsCovered" is an array of strings
- "days" array has at least 1 item
- "activities" array has at least 2 items per day`
}
