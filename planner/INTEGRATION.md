# Andaman Planner Pro — Integration Guide

## Overview

Andaman Planner Pro is a monorepo-based AI trip planner designed for seamless integration with **AndamanBazaar.in**. It shares one Supabase project for auth, database, and RLS.

## Architecture

```
planner/
├── apps/
│   ├── planner-next/    # Next.js 14 App Router shell (API + SSR)
│   └── planner-vite/    # Vite React demo (proves embed-ability)
├── packages/
│   ├── shared/          # Types, Zod schemas, helpers (portable)
│   ├── ui/              # React components (NO Next.js imports)
│   └── supabase-client/ # Typed DB access, repos, rate limiting
└── supabase/
    └── migrations/      # SQL migrations + RLS policies
```

## Integration Options

### Option A: Embedded Module (Preferred)

Import the portable packages directly into AndamanBazaar's Vite app:

```tsx
// In AndamanBazaar's package.json, add workspace references:
// "@andaman-planner/shared": "workspace:*",
// "@andaman-planner/ui": "workspace:*",
// "@andaman-planner/supabase-client": "workspace:*"

import { PlannerForm, ItineraryView } from "@andaman-planner/ui";
import "@andaman-planner/ui/styles.css";
```

API calls route to the planner-next shell (or Supabase Edge Functions).

### Option B: Reverse Proxy Subpath

Mount planner-next under `/planner` via reverse proxy (Nginx/Caddy):

```nginx
location /planner {
    proxy_pass http://localhost:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Set `NEXT_PUBLIC_BASE_PATH=/planner` in planner-next's env.

## Shared Auth (No Second Login)

Both apps use the **same Supabase project**. The session JWT is set by AndamanBazaar's auth flow and is accessible to the planner:

1. **Embedded (Option A):** The planner reads the existing Supabase session from the browser. `createClient(url, anonKey)` picks up the stored session automatically.
2. **Subpath (Option B):** The planner's client-side code reads the same Supabase session (same origin, same cookies). API routes receive the JWT in the `Authorization` header.

## Database Schema

The planner uses a dedicated `planner` Postgres schema to avoid name collisions:

- `planner.profiles` — per-user planner preferences
- `planner.itineraries` — AI-generated trip itineraries
- `planner.rate_limits` — per-user generation throttling

### Running Migrations

Apply the migration file `supabase/migrations/001_planner_schema.sql` to the shared Supabase project. It is also mirrored at `supabase/migrations/015_planner_schema.sql` in the AndamanBazaar root.

```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL editor in Supabase Dashboard
```

### RLS Policies

All tables have RLS enabled. Users can only access their own rows:
- `planner.profiles` — `id = auth.uid()`
- `planner.itineraries` — `user_id = auth.uid()`
- `planner.rate_limits` — `user_id = auth.uid()`

## API Endpoints

All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/planner/generate` | Generate a new itinerary |
| GET | `/api/planner/itineraries` | List user's itineraries |
| GET | `/api/planner/itineraries/:id` | Get single itinerary |
| DELETE | `/api/planner/itineraries/:id` | Delete itinerary |

### Generate Request

```json
{
  "preferences": {
    "startDate": "2025-02-01",
    "endDate": "2025-02-05",
    "travelersCount": 2,
    "budgetLevel": "midrange",
    "pace": "balanced",
    "interests": ["beaches", "snorkeling", "local-cuisine"],
    "preferredIslands": ["Havelock Island (Swaraj Dweep)"],
    "notes": null
  }
}
```

### Response Envelope

```json
{
  "apiVersion": "v1",
  "itinerary": { ... }
}
```

Error responses follow:
```json
{
  "apiVersion": "v1",
  "error": { "code": "RATE_LIMITED", "message": "..." }
}
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key (admin ops) |
| `GOOGLE_AI_API_KEY` | Server only | Google Generative AI key |
| `OPENAI_API_KEY` | Server only | OpenAI key (fallback) |
| `NEXT_PUBLIC_BASE_PATH` | Client + Server | Base path (e.g., `/planner`) |
| `RATE_LIMIT_GENERATIONS_PER_HOUR` | Server only | Max generations/hour/user (default: 5) |

For the Vite demo, use `VITE_` prefixed equivalents:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PLANNER_API_BASE` (URL of the planner-next API)

## Rollout Checklist

- [ ] Run SQL migration `001_planner_schema.sql` on the shared Supabase project
- [ ] Verify RLS policies are active (`SELECT * FROM pg_policies WHERE schemaname = 'planner'`)
- [ ] Set all environment variables on the deployment platform
- [ ] Deploy planner-next (Vercel, Docker, or reverse proxy)
- [ ] Test auth flow: sign in on AndamanBazaar → navigate to planner → session is recognized
- [ ] Test generate endpoint with a real Supabase user token
- [ ] Test rate limiting (6th call within an hour should return 429)
- [ ] Embed UI components in AndamanBazaar (Option A) or configure reverse proxy (Option B)
- [ ] Verify no CSS conflicts with host app (all planner classes use `ap-` prefix)

## CSS Theming

All planner UI classes use the `ap-` prefix. Theme variables can be overridden by the host app:

```css
:root {
  --ap-primary: #0d9488;
  --ap-primary-hover: #0f766e;
  --ap-text: #1e293b;
  --ap-border: #cbd5e1;
  --ap-card-bg: #fff;
  --ap-input-bg: #fff;
  --ap-ring: rgba(13, 148, 136, 0.15);
}
```

## Type Safety

All packages use typed Supabase queries via `createClient<Database, "planner">`. To regenerate types from the live schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema planner > packages/supabase-client/src/database.types.ts
```
