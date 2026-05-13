# AI Agent & Copilot Instructions

## Scope
This document provides repository-specific context, conventions, and constraints for AI agents (Cursor, Copilot, Claude, Hermes, OpenCode, etc.) operating in this codebase. Read this before proposing architectural changes or refactoring.

## Project Summary
- **AndamanBazaar**: A hyper-local marketplace and travel platform for the Andaman Islands.
- **Goal**: Connect buyers, sellers, vendors, and travelers in a unified app (second-hand goods, services directory, AI trip planner).
- **Deployment**: Firebase Hosting (Web) and Android (Capacitor).

## Tech Stack
- React 18 + TypeScript
- Vite 4
- Tailwind CSS
- Supabase (Auth, Database, Edge Functions)
- Capacitor 5 (Mobile wrapper)
- HashRouter (React Router 6)

## Important Paths
- `App.tsx`: Top-level router and auth gating.
- `index.tsx`: App bootstrap.
- `views/`: Route-level screens.
- `components/`: Shared UI pieces.
- `lib/supabase.ts`: Supabase client initialization.
- `schema.sql`: Database schema reference.
- `capacitor.config.json`: Capacitor app configuration.

## Commands / Workflow
- **Install**: `npm install`
- **Dev Server**: `npm run dev`
- **Build Web**: `npm run build`
- **Deploy Web**: `npm run firebase-deploy`
- **Sync Mobile**: `npm run cap-sync`

## Architectural Constraints & Conventions
- **Routing**: The app uses `HashRouter`. Do not introduce history API / server-side routing assumptions. Firebase Hosting rewrites all paths to `index.html`.
- **Mobile First**: Features must be mobile-responsive. Use Capacitor plugins (e.g., Geolocation, Camera) for native device access.
- **Supabase Sync**: Treat changes to Supabase schema carefully. If modifying queries or Edge Functions, ensure frontend `types.ts` remain aligned.
- **Styling**: Uses Tailwind CSS with a dark "VoltAgent" aesthetic. Do not use inline styles. Follow existing PostCSS pipelines.

## Security & Environment
- **Secrets Policy**: NEVER commit `.env` or hardcoded credentials. If you find hardcoded Supabase keys during a refactor, migrate them to environment variables and flag them.
- **Local Dev**: `.env.example` documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Visitor Tracking**: First load triggers a Security Definer RPC (`record_visitor`) which notifies admins. Do not break this deduplication logic.
