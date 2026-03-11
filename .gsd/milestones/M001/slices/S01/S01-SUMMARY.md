---
id: S01
parent: M001
milestone: M001
provides:
  - Full 8-table Convex schema (notes + 7 workout domain tables) with 14 indexes and 1 search index
  - 144 curated exercises seeded idempotently covering 9 muscle groups, 8 equipment types, 5 exercise types
  - Exercise query API: listExercises (dual-path search+filter), getExercise, createCustomExercise
  - Exercise browse page at /exercises with muscle group dropdown, equipment dropdown, name search, card grid
  - Clerk route protection for /exercises and /workouts
  - Shared getUserId auth helper in convex/lib/auth.ts
  - Programmatic verification script (verify-s01.ts)
requires:
  - slice: none
    provides: First slice — no upstream dependencies
affects:
  - S02 (consumes schema, exercises API, auth helper)
  - S03 (consumes exercises table for previous performance lookups)
  - S06 (consumes all backend functions for mobile UI)
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/exercises.ts
  - packages/backend/convex/seed.ts
  - packages/backend/convex/lib/auth.ts
  - packages/backend/data/exercises.json
  - packages/backend/scripts/verify-s01.ts
  - apps/web/src/app/exercises/page.tsx
  - apps/web/src/components/exercises/ExerciseList.tsx
  - apps/web/src/components/exercises/ExerciseFilters.tsx
  - apps/web/src/components/exercises/ExerciseCard.tsx
  - apps/web/src/middleware.ts
  - apps/web/src/app/layout.tsx
key_decisions:
  - D011: Fully normalized 7-table schema with v.id() references (not nested documents)
  - D012: primaryMuscleGroup as indexed string, secondaryMuscleGroups as display-only array
  - D013: Dual query path — withSearchIndex for text search, withIndex for filter-only browse
  - D014: Seed idempotency via per-exercise slug check
  - Kept notes table for backward compatibility
  - JSON seed data imported via ES module import (Convex bundler resolves natively)
  - Native HTML select elements for filters (no headless UI dependency)
patterns_established:
  - Shared auth helpers in convex/lib/ imported by all query/mutation files
  - Enum validators as v.union(v.literal(...)) constants at top of schema, reused across tables
  - Seed data in packages/backend/data/ as static JSON
  - Exercise components in src/components/exercises/ folder
  - Query-arg builder pattern (empty string filter values excluded from Convex args)
  - internalMutation for seed operations (not exposed to client)
  - Verification scripts in packages/backend/scripts/ using ConvexHttpClient
observability_surfaces:
  - Seed mutation logs "Seed complete: N inserted, N skipped of N" to Convex function logs
  - Query functions return empty arrays (not errors) for no-match filters
  - createCustomExercise throws "User not found" on auth failure
  - Loading spinner in UI while Convex query resolves; empty state with contextual message for no results
  - Verification script outputs structured PASS/FAIL per requirement
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T04-SUMMARY.md
duration: ~2h
verification_result: passed
completed_at: 2026-03-11
---

# S01: Convex Schema & Exercise Library

**Deployed full workout-domain Convex schema (8 tables, 14 indexes), seeded 144 curated exercises, and shipped a working exercise browse page with muscle group/equipment filters and name search — auth-gated via Clerk.**

## What Happened

**T01 — Schema & Seed Data:** Replaced the notes-only schema with a full 8-table workout domain schema (notes + exercises, workouts, workoutExercises, sets, workoutTemplates, templateExercises, userPreferences). All indexes needed through S06 are defined upfront. Created 144 curated exercises in `data/exercises.json` covering all 9 muscle groups, 8 equipment types, and 5 exercise types. Extracted `getUserId` auth helper to `convex/lib/auth.ts` for reuse across all Convex functions.

**T02 — Seed Mutation & Query API:** Created `seed.ts` as an `internalMutation` that idempotently loads exercises by checking slug existence before inserting. Created `exercises.ts` with a dual-path `listExercises` query (withSearchIndex for text search, withIndex for filter-only), `getExercise` by ID, and `createCustomExercise` auth-gated mutation. Deployed schema to Convex, ran seed (144 inserted), and verified all query paths return correct results.

**T03 — Exercise Browse Page:** Built `/exercises` route with `ExerciseList` (owns filter state, calls Convex query), `ExerciseFilters` (search input, muscle group dropdown, equipment dropdown), and `ExerciseCard` (name + colored badges). Added `/exercises` and `/workouts` to Clerk middleware protected routes. Updated layout metadata from "Notes App" to "Workout Tracker".

**T04 — End-to-End Verification:** Created `verify-s01.ts` programmatic verification script (6 assertions against Convex). Browser-verified: 144 exercises render, chest filter → 16 results, barbell filter → 30 results, "press" search → 19 results, unauthenticated access redirects to Clerk sign-in.

## Verification

- `pnpm turbo typecheck` — all 3 packages (backend, web, native) compile cleanly
- `npx convex dev` — schema deployed with all 14 indexes and 1 search index
- Seed: 144 exercises inserted on first run, 0 inserted / 144 skipped on second run (idempotent)
- `npx tsx packages/backend/scripts/verify-s01.ts` — 6/6 assertions PASS
- Browser: `/exercises` unauthenticated → Clerk sign-in redirect (R023)
- Browser: 144 exercises rendered in card grid (R001)
- Browser: chest filter → 16, barbell filter → 30, "press" search → 19 (R010)
- Browser: no app-level console errors

## Requirements Advanced

- R001 — Exercise library fully delivered: 144 curated exercises seeded, queryable, browsable at /exercises
- R010 — Filtering fully delivered: muscle group dropdown, equipment dropdown, and name search all functional with correct results
- R023 — Auth gating delivered on web: /exercises and /workouts routes protected via Clerk middleware

## Requirements Validated

- R001 — 144 exercises seeded and browsable with all metadata fields. Verified by programmatic script (6 assertions) and browser (card grid, count badges).
- R010 — All three filter paths verified: muscle group (chest → 16), equipment (barbell → 30), text search (press → 19), combined filters narrow correctly. Verified by script and browser.
- R023 — /exercises route redirects unauthenticated users to Clerk sign-in. createCustomExercise mutation requires auth context. Verified in browser. Mobile auth deferred to S06.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Had to set `CLERK_ISSUER_URL` as Convex environment variable on local backend before schema deploy could succeed (auth config requires it).
- Fixed pre-existing broken import path in `notes.ts`: `from "../convex/_generated/api"` → `from "./_generated/api"`.
- Created `apps/web/.env.local` with required env vars that were missing from the template (pre-existing gap).
- Browser sign-in for T04 verification required Clerk Backend API sign-in tokens to bypass CAPTCHA/2FA in headless browser.

## Known Limitations

- Full browser verification of the signed-in exercise flow required Clerk sign-in token workaround — standard Clerk testing pattern but adds complexity for automated regression.
- `createCustomExercise` mutation exists but has no UI — will be surfaced in a future slice if needed.
- Exercise instructions are short single-line descriptions — sufficient for MVP but could be richer.
- No pagination on exercise list (200 result cap in query) — sufficient for 144 exercises but may need pagination for custom exercises growth.

## Follow-ups

- none — all planned work completed as specified.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Full 8-table schema with validators, indexes, search index
- `packages/backend/convex/lib/auth.ts` — Shared getUserId auth helper
- `packages/backend/convex/notes.ts` — Updated imports to shared auth helper, fixed _generated path
- `packages/backend/data/exercises.json` — 144 curated exercises
- `packages/backend/convex/seed.ts` — Idempotent seedExercises internalMutation
- `packages/backend/convex/exercises.ts` — listExercises, getExercise, createCustomExercise
- `packages/backend/scripts/verify-s01.ts` — Programmatic verification script (6 assertions)
- `apps/web/src/app/exercises/page.tsx` — Exercise library page route
- `apps/web/src/components/exercises/ExerciseList.tsx` — Filter state + Convex query + grid composition
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — Search input + filter dropdowns
- `apps/web/src/components/exercises/ExerciseCard.tsx` — Exercise display card with badges
- `apps/web/src/middleware.ts` — Added /exercises and /workouts to Clerk protected routes
- `apps/web/src/app/layout.tsx` — Updated metadata to "Workout Tracker"

## Forward Intelligence

### What the next slice should know
- The schema is complete for all S01-S06 tables — S02 does NOT need to modify the schema, only add new Convex function files for workouts, sets, workoutExercises, and userPreferences.
- `getUserId` in `convex/lib/auth.ts` returns `string | undefined` — callers must check for undefined and throw/return appropriately.
- The `exercises` table uses `by_slug` index for uniqueness checks and `search_name` search index for text queries — S02's exercise picker should use `listExercises` from `exercises.ts`, not direct table queries.
- Convex env var `CLERK_ISSUER_URL` must be set on local backend for auth to work. This is already done on the current dev instance.

### What's fragile
- The dual-path query in `listExercises` (search index vs regular index) means any schema change to exercise fields could break both paths — test both after changes.
- Convex search indexes have eventual consistency — newly seeded exercises may take a moment to appear in search results (filter-only queries are immediately consistent).

### Authoritative diagnostics
- `npx tsx packages/backend/scripts/verify-s01.ts` — fast programmatic check that R001 and R010 still hold. Exit code 0 = pass.
- Convex dashboard → `exercises` table → should show 144 rows.
- `npx convex run exercises:listExercises '{"primaryMuscleGroup":"chest"}'` — quick CLI filter check.

### What assumptions changed
- Exercise type enum includes `plyometric` (5 types total) in addition to the 4 originally assumed (strength/cardio/bodyweight/stretch) — schema and seed data both include it.
- 144 exercises created vs the ~100-150 target — landed at the high end of the range.
