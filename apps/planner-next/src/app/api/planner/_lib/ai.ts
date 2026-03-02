import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { itineraryDaySchema, tripPreferencesSchema, uniqStringsPreserveOrder } from '@andamanbazaar/planner-shared';
import type { ItineraryDay, TripPreferences } from '@andamanbazaar/planner-shared';

const aiDraftSchema = z.object({
  name: z.string().min(1).max(140),
  days: z.array(itineraryDaySchema).min(1).max(60),
});

function buildSystemPrompt(): string {
  return [
    'You are an expert Andaman itinerary planner.',
    'Return ONLY valid JSON (no markdown, no prose).',
    'The JSON must match exactly this TypeScript-like schema:',
    '{',
    '  "name": string,',
    '  "days": Array<{',
    '    "date": "YYYY-MM-DD",',
    '    "island": string,',
    '    "title": string,',
    '    "summary": string,',
    '    "activities": Array<{',
    '      "time": "HH:MM",',
    '      "title": string,',
    '      "description": string,',
    '      "location": string,',
    '      "island": string,',
    '      "durationMinutes": number | null,',
    '      "costEstimateInr": number | null,',
    '      "bookingNotes": string | null',
    '    }>,',
    '    "notes": string | null',
    '  }>',
    '}',
    'Hard constraints:',
    '- No impossible island hops in a single morning without travel time.',
    '- Keep island names consistent across all items.',
    '- Activities should be realistic for Andaman (Havelock/Swaraj Dweep, Neil/Shaheed Dweep, Port Blair, Baratang, Ross/Netaji Subhash Chandra Bose Island).',
    '- Include at least 3 activities per day for balanced/packed pace; 2 for relaxed.',
  ].join('\n');
}

function buildUserPrompt(preferences: TripPreferences): string {
  return [
    'Trip preferences JSON:',
    JSON.stringify(preferences),
    '',
    'Plan a day-by-day itinerary that fits these preferences.',
  ].join('\n');
}

function safeParseJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function generateItineraryDraft(params: {
  preferences: TripPreferences;
}): Promise<{ name: string; days: ItineraryDay[]; modelVersion: string; usedFallback: boolean }> {
  const prefs = tripPreferencesSchema.parse(params.preferences);

  const primaryModel = process.env.PLANNER_AI_PRIMARY_MODEL || 'gemini-1.5-pro';
  const repairModel = process.env.PLANNER_AI_REPAIR_MODEL || 'gemini-1.5-flash';
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const days = buildDeterministicFallback(prefs);
    return {
      name: 'Andaman Trip Plan',
      days,
      modelVersion: `fallback_v1`,
      usedFallback: true,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(prefs);

  const model = genAI.getGenerativeModel({
    model: primaryModel,
    generationConfig: { temperature: 0.6, responseMimeType: 'application/json' as any },
  });

  const raw = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
  });

  const text = raw.response.text();
  const parsed1 = safeParseJson(text);
  const attempt1 = aiDraftSchema.safeParse(parsed1);
  if (attempt1.success) {
    return { ...attempt1.data, modelVersion: primaryModel, usedFallback: false };
  }

  const repair = genAI.getGenerativeModel({
    model: repairModel,
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' as any },
  });

  const repairPrompt = [
    systemPrompt,
    '',
    'The previous output failed validation.',
    'Return ONLY corrected JSON that matches schema.',
    'Validation errors:',
    attempt1.error.issues.map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n'),
    '',
    'Broken JSON (may be invalid):',
    text,
  ].join('\n');

  const raw2 = await repair.generateContent({
    contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
  });
  const text2 = raw2.response.text();
  const parsed2 = safeParseJson(text2);
  const attempt2 = aiDraftSchema.parse(parsed2);

  return { ...attempt2, modelVersion: `${primaryModel}+repair:${repairModel}`, usedFallback: false };
}

function buildDeterministicFallback(preferences: TripPreferences): ItineraryDay[] {
  const start = new Date(preferences.startDate + 'T00:00:00Z');
  const end = new Date(preferences.endDate + 'T00:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);

  const preferred = uniqStringsPreserveOrder(preferences.preferredIslands);
  const islands = preferred.length ? preferred : ['Port Blair', 'Havelock (Swaraj Dweep)', 'Neil (Shaheed Dweep)'];

  const out: ItineraryDay[] = [];
  for (let i = 0; i < daysCount; i++) {
    const date = new Date(start.getTime() + i * msPerDay).toISOString().slice(0, 10);
    const island = islands[Math.min(i, islands.length - 1)] ?? 'Port Blair';
    out.push({
      date,
      island,
      title: `Day ${i + 1} in ${island}`,
      summary: `A balanced day on ${island} with realistic pacing and buffer time.`,
      activities: [
        {
          time: '08:30',
          title: 'Breakfast + local briefing',
          description: 'Start the day with breakfast and confirm tickets/permits if needed.',
          location: island,
          island,
          durationMinutes: 60,
          costEstimateInr: null,
          bookingNotes: null,
        },
        {
          time: '10:30',
          title: 'Main activity',
          description: 'A suitable activity based on interests and season (details to refine once inventory is connected).',
          location: island,
          island,
          durationMinutes: 150,
          costEstimateInr: null,
          bookingNotes: null,
        },
        {
          time: '17:30',
          title: 'Sunset / beach time',
          description: 'Wind down with a relaxed sunset spot and dinner planning.',
          location: island,
          island,
          durationMinutes: 90,
          costEstimateInr: null,
          bookingNotes: null,
        },
      ],
      notes: preferences.notes ?? null,
    });
  }
  return out;
}

