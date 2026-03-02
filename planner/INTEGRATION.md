# Andaman Planner Pro — Integration Guide

This document explains how to integrate the Andaman Planner Pro into the production
[AndamanBazaar.in](https://andamanbazaar.in) React + Vite + TypeScript application.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Setup](#2-database-setup)
3. [Environment Variables](#3-environment-variables)
4. [Option A — Embedded Module (Vite/React)](#4-option-a--embedded-module-vitereact)
5. [Option B — Separate App at /planner (Next.js)](#5-option-b--separate-app-at-planner-nextjs)
6. [Shared Auth — No Second Login](#6-shared-auth--no-second-login)
7. [API Contract Reference](#7-api-contract-reference)
8. [Rollout Checklist](#8-rollout-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AndamanBazaar.in (Vite)                       │
│  ┌────────────────────────────────┐                             │
│  │  Existing marketplace routes  │                             │
│  └────────────────────────────────┘                             │
│  ┌────────────────────────────────┐    shared Supabase project  │
│  │  /planner  (Option A: embed)  │◄───────────────────────────►│
│  │  using @andaman-planner/ui    │                             │
│  └────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘

              ─── OR ───

┌─────────────────────────────────────────┐
│   Reverse Proxy (Caddy / nginx)         │
│   andamanbazaar.in/* → Vite app         │
│   andamanbazaar.in/planner/* → Next.js  │
└─────────────────────────────────────────┘
```

### Monorepo packages

| Package | Purpose |
|---|---|
| `@andaman-planner/shared` | Types, Zod schemas, date/budget helpers |
| `@andaman-planner/ui` | Portable React 18 components (no Next imports) |
| `@andaman-planner/supabase` | Typed Supabase client + repository layer |
| `apps/planner-next` | Optional Next.js 14 shell (API routes + SSR) |
| `apps/planner-vite` | Vite demo harness (proves embed-ability) |

---

## 2. Database Setup

### Run migrations

```bash
# Option 1: Supabase CLI
supabase db push --project-ref <YOUR_PROJECT_ID>

# Option 2: psql directly
psql "$DATABASE_URL" -f planner/supabase/migrations/001_planner_schema.sql
psql "$DATABASE_URL" -f planner/supabase/migrations/002_planner_rls.sql
```

### What gets created

The migrations create a dedicated `planner` schema (separate from `public`) so they
**never collide** with existing marketplace tables (`public.profiles`, `public.listings`, etc.):

| Table | Purpose |
|---|---|
| `planner.profiles` | Per-user planner preferences |
| `planner.itineraries` | AI-generated trip plans (JSONB days) |
| `planner.rate_limits` | Server-side rate limiting (5 generations/hr/user) |

RLS is **enabled on all three tables**. Users can only access their own rows.

### Regenerate TypeScript types after schema changes

```bash
npx supabase gen types typescript \
  --project-id <YOUR_PROJECT_ID> \
  --schema planner \
  > planner/packages/supabase/src/types/database.types.ts
```

---

## 3. Environment Variables

### Shared across both deployment options

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Client | Same Supabase project URL as AndamanBazaar |
| `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Same anon key as AndamanBazaar |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Needed for rate limiting writes (bypasses RLS) |
| `GEMINI_API_KEY` | Server only | Google Gemini API key for AI generation |

> **Critical**: `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must **never** be exposed
> to the browser. They are only used in Next.js Route Handlers or a secure backend proxy.

---

## 4. Option A — Embedded Module (Vite/React)

This is the **preferred** long-term approach: the planner UI lives inside AndamanBazaar
as a route, reusing the existing Supabase session and Tailwind tokens.

### Step 1: Add workspace packages to AndamanBazaar

Since AndamanBazaar is not (yet) a monorepo, copy or symlink the packages:

```bash
# From AndamanBazaar root
cp -r ../planner/packages/shared ./packages/planner-shared
cp -r ../planner/packages/ui     ./packages/planner-ui
cp -r ../planner/packages/supabase ./packages/planner-supabase
```

Or add as local path deps in `package.json`:

```json
{
  "dependencies": {
    "@andaman-planner/shared":   "file:../planner/packages/shared",
    "@andaman-planner/ui":       "file:../planner/packages/ui",
    "@andaman-planner/supabase": "file:../planner/packages/supabase"
  }
}
```

### Step 2: Add the Planner route to AndamanBazaar's router

```tsx
// src/App.tsx  (inside <Routes>)
import { PlannerPage } from './pages/PlannerPage'

<Route path="/planner/*" element={<PlannerPage />} />
```

### Step 3: Create PlannerPage.tsx

```tsx
// src/pages/PlannerPage.tsx
import React, { useState } from 'react'
import { PlannerForm, ItineraryView } from '@andaman-planner/ui'
import type { TripPreferences, Itinerary } from '@andaman-planner/shared'
import { supabase } from '../lib/supabase'  // existing AndamanBazaar client

export function PlannerPage() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (preferences: TripPreferences) => {
    setIsLoading(true)
    setError(null)
    try {
      // Get the current session token from the existing AndamanBazaar Supabase client
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please sign in first.')

      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ preferences }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)
      setItinerary(json.itinerary)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (itinerary) {
    return <ItineraryView itinerary={itinerary} onReset={() => setItinerary(null)} />
  }
  return (
    <>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <PlannerForm onSubmit={handleGenerate} isLoading={isLoading} />
    </>
  )
}
```

### Step 4: API proxy

When embedded in Vite, the `/api/planner/generate` call needs to go somewhere.
Options:

**A) Vite dev proxy** → Next.js running locally:
```ts
// vite.config.ts
server: {
  proxy: {
    '/api/planner': {
      target: 'http://localhost:3001',  // Next.js planner-next
      changeOrigin: true,
    }
  }
}
```

**B) Supabase Edge Function** (serverless, no Next.js needed):
Deploy `planner/supabase/functions/generate-itinerary/` to Supabase Functions and
call `https://YOUR_PROJECT.supabase.co/functions/v1/generate-itinerary`.

**C) Existing AndamanBazaar backend** (Express/Node):
Copy `apps/planner-next/src/ai/generator.ts` into the backend and expose
`POST /api/planner/generate`.

---

## 5. Option B — Separate App at /planner (Next.js)

Run the Next.js shell as a separate Node.js process and proxy requests via Caddy or nginx.

### Caddy config

```caddyfile
andamanbazaar.in {
  # Planner sub-path → Next.js
  handle /planner* {
    reverse_proxy localhost:3001
  }
  # Everything else → Vite SPA
  handle {
    reverse_proxy localhost:5173
  }
}
```

### Docker Compose

```yaml
services:
  vite-app:
    build: .
    ports: ["5173:5173"]

  planner-next:
    build:
      context: ./planner
      dockerfile: apps/planner-next/Dockerfile
    ports: ["3001:3000"]
    environment:
      NEXT_PUBLIC_BASE_PATH: /planner
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
```

### Next.js basePath

Set `NEXT_PUBLIC_BASE_PATH=/planner` before building:

```bash
NEXT_PUBLIC_BASE_PATH=/planner pnpm build
```

This configures `next.config.mjs` so all routes, assets, and API calls use `/planner` as prefix.

---

## 6. Shared Auth — No Second Login

The planner uses the **same Supabase project** as AndamanBazaar, so no re-login is needed.

### How it works

1. User logs in on AndamanBazaar via Supabase Auth (anon key).
2. Session is stored in `localStorage` under key `andaman-bazaar-auth` (set in `createPlannerBrowserClient`).
3. When the planner loads (embedded or Next.js), it calls `supabase.auth.getSession()` and finds the existing session.
4. API routes accept either:
   - Cookie-based session (Next.js SSR — automatic via `@supabase/ssr`)
   - `Authorization: Bearer <JWT>` header (for Vite fetch calls)

### Planner browser client

The planner's `createPlannerBrowserClient()` is configured with the same `storageKey` as
AndamanBazaar's client, so both apps share the session transparently:

```ts
// packages/supabase/src/client.ts
auth: {
  storageKey: "andaman-bazaar-auth",  // matches AndamanBazaar's storage key
  persistSession: true,
  autoRefreshToken: true,
}
```

> **If AndamanBazaar uses a custom storage key**, update `storageKey` in
> `packages/supabase/src/client.ts` to match.

---

## 7. API Contract Reference

All endpoints return `{ apiVersion: "v1", ... }` JSON. Errors return `{ apiVersion: "v1", error: { code, message } }`.

### POST /api/planner/generate

Generate an AI itinerary.

**Request body:**
```json
{
  "preferences": {
    "startDate": "2025-03-15",
    "endDate": "2025-03-19",
    "travelersCount": 2,
    "budgetLevel": "midrange",
    "pace": "balanced",
    "interests": ["Scuba Diving", "Beach Relaxation"],
    "preferredIslands": ["Havelock Island (Swaraj Dweep)"],
    "notes": null
  }
}
```

**Response (201):**
```json
{
  "apiVersion": "v1",
  "itinerary": { ... }
}
```

**Error codes:**
- `UNAUTHENTICATED` (401) — missing or invalid session
- `VALIDATION_ERROR` (422) — invalid preferences
- `RATE_LIMITED` (429) — exceeded 5 generations/hour
- `AI_GENERATION_FAILED` (500) — Gemini returned invalid output
- `DB_ERROR` (500) — Supabase write failed

### GET /api/planner/itineraries

List user's saved itineraries (summaries).

**Response (200):**
```json
{
  "apiVersion": "v1",
  "itineraries": [
    {
      "id": "uuid",
      "name": "...",
      "startDate": "2025-03-15",
      "endDate": "2025-03-19",
      "islandsCovered": ["Port Blair", "Havelock Island (Swaraj Dweep)"],
      "estimatedBudgetRange": "₹12,000 – ₹18,000 per person",
      "createdAt": "..."
    }
  ]
}
```

### GET /api/planner/itineraries/:id

Fetch a full itinerary by UUID.

**Response (200):**
```json
{
  "apiVersion": "v1",
  "itinerary": { ... full Itinerary object ... }
}
```

---

## 8. Rollout Checklist

### Pre-deploy

- [ ] Run SQL migrations on production Supabase project
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set (server-side only, never exposed)
- [ ] Set `GEMINI_API_KEY` in server environment
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match the production Supabase project used by AndamanBazaar

### Integration

- [ ] Confirm `storageKey: "andaman-bazaar-auth"` in `packages/supabase/src/client.ts` matches AndamanBazaar's Supabase client storage key
- [ ] Test that a logged-in AndamanBazaar user can access the planner without re-login
- [ ] Test that an unauthenticated user gets a 401 from `/api/planner/generate`

### Security

- [ ] `SUPABASE_SERVICE_ROLE_KEY` must **only** exist server-side (never in `NEXT_PUBLIC_` or `VITE_` vars)
- [ ] `GEMINI_API_KEY` must **only** exist server-side
- [ ] Confirm RLS is enabled: run `SELECT * FROM planner.itineraries` as the anon role — it should return 0 rows
- [ ] Rate limit is set to 5/hour/user in `packages/supabase/src/repos/rateLimitRepo.ts`

### Testing

- [ ] Generate an itinerary end-to-end (form → AI → DB → display)
- [ ] Verify itinerary appears in "My Trips" list
- [ ] Generate 6 itineraries in quick succession — 6th should return 429
- [ ] Test with `basePath=/planner` routing

### No Firebase Verification

- [ ] `grep -r "firebase" planner/` returns no results
- [ ] `grep -r "firestore" planner/` returns no results
- [ ] No `firebase.json` or `.firebaserc` in the planner directory
