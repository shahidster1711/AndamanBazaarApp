# Andaman Planner Pro Integration Guide

This planner implementation is built to plug into `AndamanBazaar.in` with one shared Supabase project and one shared user session.

## 1) Monorepo modules

- `apps/planner-next`: Next.js 14 App Router shell for `/planner` UI + `/api/planner/*` endpoints.
- `apps/planner-vite`: Vite embed harness showing planner UI portability.
- `packages/shared`: portable domain types + Zod contracts.
- `packages/ui`: framework-portable React planner components (no Next imports).
- `packages/supabase`: typed `createClient<Database>` helpers + repositories.
- `supabase/migrations/015_planner_schema.sql`: planner schema/tables/RLS.

## 2) Supabase setup (single source of truth)

1. Run migration:
   - `supabase db push`
   - or apply `supabase/migrations/015_planner_schema.sql` in your deployment flow.
2. Ensure `planner` schema exists with:
   - `planner.profiles`
   - `planner.itineraries`
3. Confirm RLS is enabled and policies restrict rows to `auth.uid()`.

## 3) Regenerate typed DB definitions

Run this whenever DB schema changes:

- `npx supabase gen types typescript --linked --schema public,planner > packages/supabase/src/database.types.ts`

The planner repositories expect `createClient<Database>` typing from this file.

## 4) Environment variables

Required in `apps/planner-next` runtime:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY` (or `GEMINI_API_KEY`)

Optional:

- `PLANNER_PRIMARY_MODEL` (default: `gemini-1.5-pro`)
- `PLANNER_SECONDARY_MODEL` (default: `gemini-1.5-flash`)
- `NEXT_PUBLIC_BASE_PATH` (set `/planner` for subpath mount)

## 5) API contract (v1)

- `POST /api/planner/generate`
  - body: `{ "preferences": TripPreferences }`
  - returns: `{ "apiVersion": "v1", "itinerary": Itinerary }`
- `GET /api/planner/itineraries`
  - returns: `{ "apiVersion": "v1", "itineraries": ItinerarySummary[] }`
- `GET /api/planner/itineraries/:id`
  - returns: `{ "apiVersion": "v1", "itinerary": Itinerary }`

All endpoints:
- require authenticated Supabase user.
- return JSON error object on failure:
  - `{ "apiVersion": "v1", "error": { "code": "...", "message": "..." } }`

## 6) Shared auth/session model (no second login)

The planner API accepts either:
- Supabase auth cookie (preferred when mounted under same parent domain), or
- `Authorization: Bearer <supabase_access_token>`.

So AndamanBazaar users stay signed in and can use planner endpoints without a second auth flow.

## 7) Deployment options

### A) Embedded module inside AndamanBazaar (preferred)

1. Use planner UI components from `packages/ui`.
2. Keep AndamanBazaar auth bootstrap (Supabase JS session).
3. Call planner API endpoints under the same domain (`/planner/api/planner/*` when reverse-proxied).

### B) Next shell mounted at `/planner`

1. Deploy `apps/planner-next`.
2. Set `NEXT_PUBLIC_BASE_PATH=/planner`.
3. Reverse proxy `/planner` to the Next service.
4. Keep cookies on shared parent domain so Supabase session is available in planner routes.

## 8) Tailwind/theme compatibility

- Components in `packages/ui` use utility-class-friendly markup and avoid global resets.
- No global CSS reset is injected by planner packages.
- Host app controls token/theme classes.

## 9) Rollout checklist

- [ ] Migration `015_planner_schema.sql` applied in production.
- [ ] Supabase RLS policies validated with authenticated and unauthenticated requests.
- [ ] `packages/supabase/src/database.types.ts` regenerated from production schema.
- [ ] Planner API deployed with AI and Supabase environment variables.
- [ ] Reverse proxy for `/planner` configured (if using subpath deployment).
- [ ] AndamanBazaar client integration tested with existing Supabase session.
- [ ] Rate limit behavior verified (`5` generations per user per hour).
