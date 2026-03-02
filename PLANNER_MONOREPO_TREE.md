# Andaman Planner Pro Monorepo Layout

```text
.
├── apps
│   ├── planner-next
│   │   ├── app
│   │   │   ├── api
│   │   │   │   └── planner
│   │   │   │       ├── generate
│   │   │   │       │   └── route.ts
│   │   │   │       └── itineraries
│   │   │   │           ├── [id]
│   │   │   │           │   └── route.ts
│   │   │   │           └── route.ts
│   │   │   ├── planner-client.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── lib
│   │   │   ├── ai.ts
│   │   │   ├── auth.ts
│   │   │   ├── base-path.ts
│   │   │   └── rate-limit.ts
│   │   ├── next.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── planner-vite
│       ├── src
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── packages
│   ├── shared
│   │   └── src
│   │       ├── helpers.ts
│   │       ├── schemas.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── supabase
│   │   └── src
│   │       ├── clients.ts
│   │       ├── database.types.ts
│   │       ├── index.ts
│   │       └── repositories
│   │           ├── itineraryRepo.ts
│   │           └── profileRepo.ts
│   └── ui
│       └── src
│           ├── components
│           │   ├── ItineraryCard.tsx
│           │   ├── ItineraryView.tsx
│           │   └── PlannerForm.tsx
│           └── index.ts
├── supabase
│   └── migrations
│       └── 015_planner_schema.sql
└── INTEGRATION.md
```

Notes:
- Planner DB objects use `planner` Postgres schema to avoid collisions.
- `packages/ui` stays framework-portable (no Next imports).
- `apps/planner-next` is the API shell for `/api/planner/*` and `/planner` mounting.
- `apps/planner-vite` is an embed demo harness for React + Vite integration.
