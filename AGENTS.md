# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AndamanBazaar is a monorepo with two products:
1. **Water Adventures platform** (`/backend` + `/frontend`) — Express + Prisma API + React SPA for booking water activities
2. **Marketplace PWA** (root `/src`) — Supabase-backed classifieds (requires external Supabase instance; not needed for the Water Adventures product)

### Required services

| Service | How to start | Port |
|---------|-------------|------|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | 5432 |
| Backend API | `cd backend && npm run dev` | 4000 |
| Frontend | `cd frontend && npm run dev` | 5173 |

### Environment setup notes

- `.env` files: copy from `.env.example` in `backend/`, `frontend/`, and root. The backend `.env` needs `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/andamanbazaar?schema=public`.
- The backend admin API key defaults to `dev-admin-key` in docker-compose; use the same in `backend/.env` for local dev.
- **Prisma seed caveat**: `npm run prisma:seed` in `backend/` fails with Prisma 7.x because `prisma/seed.ts` calls `new PrismaClient()` without an adapter. Seed the database using SQL directly or fix the seed script to use the `@prisma/adapter-pg` adapter pattern (see `backend/src/db/prisma.ts` for reference).

### Standard commands (see README.md for full list)

- **Lint**: `cd backend && npm run lint` / `cd frontend && npm run lint`
- **Test**: `cd backend && npm test` / `cd frontend && npm test`
- **Build**: `cd backend && npm run build` / `cd frontend && npm run build`

### Gotchas

- Backend tests (`jest --runInBand`) may hang for ~1s after completion due to open async handles from the Prisma/pg pool; this is normal — Jest still exits with code 0.
- The email notification service logs errors if no SMTP server is available (port 1025); this does not affect API functionality.
- The root `package.json` is for the separate Supabase-backed marketplace app and has its own `vite.config.ts` and test setup; it is independent of the Water Adventures `backend/` + `frontend/` stack.
