# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AndamanBazaar Water Adventures — a full-stack platform for listing Andaman water adventure activities and capturing booking leads. The primary product consists of:

- **Backend** (`/backend`): Express 5 + Prisma 7 + PostgreSQL — REST API on port 4000
- **Frontend** (`/frontend`): React 19 + Vite 7 + Tailwind 4 — dev server on port 5173

There is also a root-level React 18 PWA (Product A, Supabase-based marketplace) at `/src/`, but the primary development focus is the backend + frontend (Product B).

### Services

PostgreSQL must be running on port 5432 before starting the backend. Start it with:

```
sudo pg_ctlcluster 16 main start
```

The database name is `andamanbazaar` with user `postgres` / password `postgres`.

### Running dev servers

- Backend: `cd backend && npm run dev` (port 4000)
- Frontend: `cd frontend && npm run dev` (port 5173)

Standard lint/test/build commands are in the README and each `package.json`.

### Gotchas

- **Prisma 7 seed script**: `npm run prisma:seed` (in `/backend`) fails because `prisma/seed.ts` creates `new PrismaClient()` without a driver adapter, which Prisma 7.x requires when `schema.prisma` has no `url` in the datasource block. The app code at `src/db/prisma.ts` correctly uses `PrismaPg` adapter. To seed, either fix the seed script or insert data via SQL directly using `psql`.
- **Prisma config**: Prisma 7 uses `prisma.config.ts` (not `schema.prisma` url) for the datasource URL. The `.env` file's `DATABASE_URL` is read there via `dotenv/config`.
- **Backend .env**: Copy `backend/.env.example` to `backend/.env`. The default `ADMIN_API_KEY` is `replace_with_secure_api_key`. Use it in the `x-api-key` header for admin endpoints.
- **Frontend .env**: Copy `frontend/.env.example` to `frontend/.env`. Sets `VITE_API_URL=http://localhost:4000`.
- **Backend tests (Jest)**: Tests may print "Jest did not exit one second after the test run has completed" — this is benign; tests still pass (exit code 0). The warning comes from async operations in the test database setup.
- **Email SMTP**: Lead creation logs a non-fatal SMTP error (`ECONNREFUSED :1025`) when no local mail server is running. This does not block the lead creation API — leads are still saved.
