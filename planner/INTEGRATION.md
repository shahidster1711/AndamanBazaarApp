# Andaman Planner Pro — Integration Guide

## Overview

Andaman Planner Pro is an AI-powered itinerary planner designed for seamless integration into **AndamanBazaar.in**. It uses Supabase as the single source of truth (auth, database, RLS) and ships as a monorepo with portable packages.

## Architecture

```
planner/
├── apps/
│   ├── planner-next/          # Next.js 14 App Router shell
│   └── planner-vite/          # Vite embed demo (proof of concept)
├── packages/
│   ├── shared/                # Types, Zod schemas, helpers (zero framework deps)
│   ├── ui/                    # Portable React components (no Next imports)
│   └── supabase-client/       # Typed Supabase client + repository layer
└── db/
    └── migrations/            # SQL migrations (also mirrored to /supabase/migrations/)
```

## Integration Options

### Option A: Embedded Module (Recommended)

Import the portable packages directly into the AndamanBazaar Vite app.

```tsx
// In your Vite app
import { PlannerForm, ItineraryView } from "@andaman-planner/ui";
import { createBrowserPlannerClient, createItineraryRepo } from "@andaman-planner/supabase-client";
import type { TripPreferences } from "@andaman-planner/shared";

const client = createBrowserPlannerClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Add Tailwind content paths in `tailwind.config.js`:
```js
content: [
  // ...existing paths
  "./node_modules/@andaman-planner/ui/src/**/*.{ts,tsx}",
],
```

The `@andaman-planner/ui` package uses the same Tailwind tokens as AndamanBazaar (teal, coral, font families), so no theming conflicts.

### Option B: Next.js App Under `/planner` (Reverse Proxy)

Deploy `planner-next` as a separate service and mount it at `/planner`:

**Next.js config:**
```js
// next.config.js
const nextConfig = {
  basePath: "/planner",
};
```

**Nginx / Caddy reverse proxy:**
```nginx
location /planner {
    proxy_pass http://planner-next:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Auth: Shared Session

Both apps use the **same Supabase project**. The Supabase JS client stores the session under `sb-<project-ref>-auth-token` in localStorage. Since both apps share the same origin (or the same Supabase project URL), the session is automatically shared.

### Server-side Auth (API Routes)

API routes extract the JWT from `Authorization: Bearer <token>` headers. The client reads the token from localStorage and sends it with each request.

```ts
// Client-side helper (already in planner page)
const storageKey = Object.keys(localStorage).find(
  (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
);
const session = JSON.parse(localStorage.getItem(storageKey) || "{}");
const token = session?.access_token;
```

### No Second Login

Because both apps use the same Supabase project and the same browser storage, users who log in to AndamanBazaar are automatically authenticated in the planner.

## Database Schema

The planner uses a dedicated Postgres schema: `planner`.

### Tables
- `planner.profiles` — user planner preferences
- `planner.itineraries` — generated itineraries with full JSON data
- `planner.generation_log` — rate-limiting records

### RLS
All tables have Row Level Security enabled. Users can only access their own data (`user_id = auth.uid()` / `id = auth.uid()`).

### Applying Migrations

```bash
# From the workspace root
psql $DATABASE_URL < planner/db/migrations/001_planner_schema.sql

# Or via Supabase CLI
supabase db push
```

The migration is also available at `supabase/migrations/015_planner_schema.sql` for the existing migration pipeline.

## API Endpoints

All endpoints require `Authorization: Bearer <supabase-jwt>` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/planner/generate` | Generate itinerary from preferences |
| GET | `/api/planner/itineraries` | List user's saved itineraries |
| GET | `/api/planner/itineraries/:id` | Get single itinerary detail |
| DELETE | `/api/planner/itineraries/:id` | Delete an itinerary |

### Generate Request
```json
{
  "preferences": {
    "startDate": "2025-03-15",
    "endDate": "2025-03-20",
    "travelersCount": 2,
    "budgetLevel": "midrange",
    "pace": "balanced",
    "interests": ["beaches", "snorkeling", "local-cuisine"],
    "preferredIslands": ["Havelock Island (Swaraj Dweep)"],
    "notes": null
  }
}
```

### Generate Response
```json
{
  "apiVersion": "v1",
  "itinerary": {
    "id": "uuid",
    "userId": "uuid",
    "name": "5-Day Island Paradise",
    "startDate": "2025-03-15",
    "endDate": "2025-03-20",
    "days": [...],
    "islandsCovered": ["Port Blair", "Havelock Island"],
    "estimatedBudgetRange": "₹50K – ₹90K",
    "modelVersion": "gemini-1.5-pro",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Rate Limiting
5 generations per user per hour. Returns `429` with error code `RATE_LIMITED` when exceeded.

## Environment Variables

### Required for Next.js App
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `GOOGLE_AI_API_KEY` | Google Gemini API key |
| `NEXT_PUBLIC_BASE_PATH` | Base path (e.g., `/planner` or empty) |

### For Vite Embed
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Same Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Same anon key |
| `VITE_PLANNER_API_URL` | URL to the planner API (e.g., `https://andamanbazaar.in/planner`) |

## Rollout Checklist

- [ ] Run SQL migration `001_planner_schema.sql` on production Supabase
- [ ] Set environment variables on the deployment platform
- [ ] Deploy `planner-next` or embed packages into AndamanBazaar
- [ ] Verify auth session sharing works across both apps
- [ ] Test rate limiting with a real user
- [ ] Monitor AI generation costs (Gemini API usage)

## Package Dependencies

```
@andaman-planner/shared     → zero runtime deps (only zod)
@andaman-planner/ui          → react, clsx, tailwind-merge, lucide-react
@andaman-planner/supabase-client → @supabase/supabase-js, @andaman-planner/shared
```

None of these packages import from Next.js, making them safe to embed in any React app.
