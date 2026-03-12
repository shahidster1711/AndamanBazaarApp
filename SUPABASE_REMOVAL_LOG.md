# Supabase Removal Log

Date completed: 2026-03-13

## Summary

All Supabase dependencies have been removed from the AndamanBazaarApp frontend codebase.
The application now runs exclusively on Firebase (Auth, Firestore, Storage, Cloud Functions).

## Packages Removed

| Package | Version | Reason |
|---|---|---|
| `@supabase/supabase-js` | ^2.98.0 | Main Supabase client SDK |
| `supabase` | ^2.76.16 | Supabase CLI (was in dependencies) |

28 transitive packages removed alongside these two.

## Source Files Deleted

- `src/lib/supabase.ts` — Supabase client initialisation
- `src/lib/__mocks__/supabase.ts` — Vitest mock for supabase client

## Files Modified

### Core Library Layer

| File | Change |
|---|---|
| `src/lib/auth.ts` | Removed all Supabase auth branches; Firebase-only |
| `src/lib/storage.ts` | Removed all Supabase storage branches; Firebase Storage only |
| `src/lib/database.ts` | Removed dual-provider system; Firestore-only CRUD |
| `src/lib/functions.ts` | Removed `supabase.functions.invoke` calls; Firebase Cloud Functions fetch only |

### Pages

| File | Change |
|---|---|
| `src/App.tsx` | Replaced Supabase session with Firebase `onAuthStateChanged` |
| `src/pages/Home.tsx` | Replaced Supabase listing queries with Firestore |
| `src/pages/Listings.tsx` | Replaced Supabase listing queries with Firestore |
| `src/pages/ListingDetail.tsx` | Replaced Supabase favorites/profiles with Firestore |
| `src/pages/CreateListing.tsx` | Replaced `supabase.auth`, `supabase.from`, `supabase.functions.invoke` |
| `src/pages/Profile.tsx` | Replaced all Supabase calls with Firestore |
| `src/pages/Admin.tsx` | Replaced all Supabase calls with Firestore |
| `src/pages/Dashboard.tsx` | Replaced Supabase queries with Firestore |
| `src/pages/ChatList.tsx` | Replaced with Firestore `onSnapshot` |
| `src/pages/ChatRoom.tsx` | Replaced with Firestore |
| `src/pages/BoostSuccess.tsx` | Replaced Supabase query with Firestore `getDocs` |
| `src/pages/SellerProfile.tsx` | Replaced Supabase queries with Firestore `getDoc`/`getDocs` |
| `src/pages/Todos.tsx` | Replaced Supabase CRUD with Firestore operations |

### Components

| File | Change |
|---|---|
| `src/components/Layout.tsx` | Replaced Supabase database layer with Firebase |
| `src/components/ReportModal.tsx` | Replaced `supabase.auth` and `supabase.from` |
| `src/components/AuthView.tsx` | Replaced Supabase-specific auth flows |
| `src/components/BoostListingModal.tsx` | Replaced Supabase session and URL |
| `src/components/InvoiceHistory.tsx` | Replaced Supabase invoice queries with Firestore |
| `src/components/MigrationDashboard.tsx` | Removed provider detection stubs; hardcoded `firebase` |

### Hooks

| File | Change |
|---|---|
| `src/hooks/useNotifications.ts` | Replaced with Firestore `onSnapshot` |

### Other

| File | Change |
|---|---|
| `src/lib/security.ts` | Removed `supabase.rpc`, `supabase.auth`, `supabase.from('audit_logs')` |
| `src/lib/database.ts` | Added extended fields (`area`, `itemAge`, etc.) to `Listing` interface |
| `src/lib/functions.ts` | Made `accuracy`/`timestamp` optional in `LocationVerificationRequest` |

## Retained (Intentional)

- `supabase/` directory (migrations, edge functions) — kept for historical reference; not used by frontend
- `SUPABASE_ANALYSIS.md`, `SUPABASE_MIGRATION_DESIGN.md`, `SUPABASE_REMOVAL_PLAN.md` — reference docs

## Build Verification

```
tsc && vite build
✓ 3238 modules transformed.
✓ built in 4.04s
Exit code: 0 — zero TypeScript errors, zero build errors
```
