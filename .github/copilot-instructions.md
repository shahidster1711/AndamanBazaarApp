# Copilot Instructions for AndamanBazaarApp

## Project Overview
AndamanBazaarApp is a React + TypeScript marketplace web application for the Andaman Islands. It uses Vite as the build tool, Supabase for the backend (auth, database, storage), and Tailwind CSS with Radix UI primitives for styling.

## Tech Stack
- **Frontend**: React 18, TypeScript, React Router v6, Tailwind CSS, Radix UI, Recharts
- **Backend**: Supabase (PostgreSQL, Auth, Storage), Node.js/Express (in `backend/`)
- **Build**: Vite, `tsc` for type-checking
- **Testing**: Vitest (unit/integration), Playwright (e2e)
- **Linting**: ESLint with `@typescript-eslint` rules

## Directory Structure
- `src/` — Frontend React application
  - `src/pages/` — Page-level route components
  - `src/components/` — Shared UI components (and `src/components/ui/` for base primitives)
  - `src/hooks/` — Custom React hooks
  - `src/lib/` — Utility libraries (Supabase client, helpers)
- `backend/` — Node.js/Express API server with Prisma ORM
- `tests/` — Unit, integration, security, and accessibility tests
- `e2e/` — Playwright end-to-end tests
- `supabase/` — Supabase migrations and Edge Functions
- `migrations/` — SQL migration files

## Build & Validation Commands
```bash
npm run build          # tsc + vite build (type-check + bundle)
npm run test:unit      # vitest run tests/unit
npm run test:integration  # vitest run tests/integration
npm run test:e2e       # playwright test
npm run test:all       # unit + integration + security + accessibility
```

## Code Conventions
- All new React components must be written in TypeScript (`.tsx`).
- Use functional components and React hooks; avoid class components.
- Prefer `import type` for type-only imports.
- Environment variables are accessed via `import.meta.env.VITE_*` in the frontend and `process.env.*` in the backend.
- Supabase client is initialised once in `src/lib/` and imported throughout the app; do not create new client instances elsewhere.
- DOMPurify is used to sanitise any HTML rendered from user input.
- Form validation uses Zod schemas.

## Security Notes
- Never commit secrets, tokens, or private keys.
- The `.env.example` file shows required environment variables; actual values live in `.env` (git-ignored).
- All user-generated content must be sanitised with DOMPurify before rendering.
