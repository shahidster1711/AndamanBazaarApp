/**
 * AI Itinerary Generator — multi-model strategy.
 *
 * Primary model: gemini-2.0-flash-exp  (best reasoning, full generation)
 * Secondary model: gemini-1.5-flash    (cheap/fast, JSON repair + derived fields)
 *
 * Flow:
 * 1. Call primary model with full prompt.
 * 2. Validate JSON against AiItineraryOutputSchema.
 * 3. If invalid, call secondary model to repair JSON (up to MAX_REPAIR_ATTEMPTS).
 * 4. Return typed AiItineraryOutput.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { AiItineraryOutputSchema } from "@andaman-planner/shared"
import type { TripPreferences, AiItineraryOutput } from "@andaman-planner/shared"
import { buildItineraryPrompt, buildRepairPrompt } from "./prompts"

const PRIMARY_MODEL = "gemini-2.0-flash-exp"
const SECONDARY_MODEL = "gemini-1.5-flash"
const MAX_REPAIR_ATTEMPTS = 2

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? ""
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set.")
  return new GoogleGenerativeAI(apiKey)
}

/** Extracts the first JSON object from a model response string. */
function extractJson(raw: string): string {
  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  // Find the first { and the matching last }
  const start = stripped.indexOf("{")
  const end = stripped.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response.")
  return stripped.slice(start, end + 1)
}

/** Calls a Gemini model and returns the text response. */
async function callModel(
  client: GoogleGenerativeAI,
  modelName: string,
  prompt: string
): Promise<string> {
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  if (!text) throw new Error(`${modelName} returned an empty response.`)
  return text
}

/**
 * Main generation function.
 * Returns a validated AiItineraryOutput or throws.
 */
export async function generateItinerary(
  preferences: TripPreferences
): Promise<{ output: AiItineraryOutput; modelVersion: string }> {
  const client = getGeminiClient()
  const prompt = buildItineraryPrompt(preferences)

  // ---- Step 1: Primary model call ----
  let rawText: string
  try {
    rawText = await callModel(client, PRIMARY_MODEL, prompt)
  } catch (err) {
    throw new Error(`Primary model (${PRIMARY_MODEL}) failed: ${String(err)}`)
  }

  // ---- Step 2: Parse + validate ----
  let jsonStr: string
  try {
    jsonStr = extractJson(rawText)
  } catch {
    jsonStr = rawText
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (err) {
    throw new Error(`Primary model returned unparseable JSON: ${String(err)}\n\nRaw: ${jsonStr.slice(0, 500)}`)
  }

  const validation = AiItineraryOutputSchema.safeParse(parsed)
  if (validation.success) {
    return { output: validation.data, modelVersion: PRIMARY_MODEL }
  }

  // ---- Step 3: Repair loop with secondary model ----
  let repairInput = jsonStr
  let lastErrors = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n")

  for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    console.log(`[planner-ai] Repair attempt ${attempt}/${MAX_REPAIR_ATTEMPTS}`)
    const repairPrompt = buildRepairPrompt(repairInput, lastErrors)

    let repairText: string
    try {
      repairText = await callModel(client, SECONDARY_MODEL, repairPrompt)
    } catch (err) {
      console.error(`[planner-ai] Secondary model repair attempt ${attempt} failed:`, err)
      continue
    }

    try {
      repairInput = extractJson(repairText)
    } catch {
      repairInput = repairText
    }

    let repairParsed: unknown
    try {
      repairParsed = JSON.parse(repairInput)
    } catch {
      continue
    }

    const repairValidation = AiItineraryOutputSchema.safeParse(repairParsed)
    if (repairValidation.success) {
      return { output: repairValidation.data, modelVersion: `${PRIMARY_MODEL}+${SECONDARY_MODEL}-repair` }
    }

    lastErrors = repairValidation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n")
  }

  throw new Error(
    `AI output failed validation after ${MAX_REPAIR_ATTEMPTS} repair attempts.\n` +
      `Last errors:\n${lastErrors}`
  )
}
