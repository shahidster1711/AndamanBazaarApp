# Andaman Planner Pro — Integration Guide

This repo implements the planner as **portable packages** plus an optional **Next.js App Router shell** that can be mounted under a subpath like `/planner`.

## Monorepo tree (integration-safe)

```text
.
├─ supabase/
│  └─ migrations/
│     └─ 015_planner_schema.sql
├─ packages/
│  ├─ shared/     # domain model + Zod + API contract + api client
│  ├─ supabase/   # typed Supabase access + repositories
│  └─ ui/         # portable Tailwind components (no Next imports)
└─ apps/
   └─ planner-next/   # optional Next shell for /api/planner/* (basePath safe)
```

## 1) Database (Supabase) — apply migrations

Planner tables live in the dedicated Postgres schema: `planner`.

Migration:
- `supabase/migrations/015_planner_schema.sql`

It creates:
- `planner.profiles`
- `planner.itineraries`
- `planner.generation_events` (rate limiting bookkeeping)

RLS:
- `planner.profiles`: user can manage only their row where `id = auth.uid()`
- `planner.itineraries`: user can manage only rows where `user_id = auth.uid()`
- `planner.generation_events`: user can insert/select only their own rows

## 2) Type safety — generate Supabase types

The planner uses `createClient<Database>` and expects types generated from Supabase.

File to regenerate:
- `packages/supabase/src/database.types.ts`

Example command (you run this from your environment):

```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema planner,public \
  > packages/supabase/src/database.types.ts
```

## 3) Embedding into AndamanBazaar (React + TS + Vite + Tailwind)

### Portable UI

Use components from:
- `@andamanbazaar/planner-ui`

Core integration pattern:
- Host app owns routing and auth.
- Planner UI calls a host-provided `generate(preferences)` function.

### API client (contract-first)

Use:
- `createPlannerApiClient()` from `@andamanbazaar/planner-shared`

Recommended auth wiring (no second login):
- Use the existing Supabase session in AndamanBazaar.
- Send the current access token as `Authorization: Bearer <token>` to planner endpoints.

## 4) Option A (preferred): embedded module, same origin

Mount planner UI at `/planner` in AndamanBazaar routing.

If your planner endpoints are also same-origin (recommended), set `baseUrl: ""`.

## 5) Option B: separate Next app under `/planner` via reverse proxy

Deploy `apps/planner-next` and mount it under `/planner`.

### Next basePath

Set:
- `NEXT_PUBLIC_BASE_PATH=/planner`

### Required env vars (Next app)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (optional; if missing, endpoint uses a deterministic fallback itinerary generator)

### Reverse proxy

Ensure the reverse proxy forwards:
- `Host`
- `X-Forwarded-*`
- `Authorization` header (required if embedding from another origin during dev)

## 6) API contract (v1)

Endpoints:
- `POST /api/planner/generate`
  - body: `{ preferences: TripPreferences }`
  - returns: `{ apiVersion: "v1", itinerary: Itinerary }`
- `GET /api/planner/itineraries`
  - returns: `{ apiVersion: "v1", itineraries: ItinerarySummary[] }`
- `GET /api/planner/itineraries/:id`
  - returns: `{ apiVersion: "v1", itinerary: Itinerary }`

Validation:
- Requests and responses are validated by Zod in `packages/shared`.
- Core endpoints return **JSON only** (no free-form text).

## 7) Rollout checklist

- Apply migration `015_planner_schema.sql` to the shared Supabase project.
- Regenerate `packages/supabase/src/database.types.ts`.
- Configure planner endpoints (Option A or B).
- Verify:
  - session reuse (no second login)
  - RLS isolation per-user for planner tables
  - basePath mounting works under `/planner`
  - rate limiting returns `429` after 5 generations/hour/user

