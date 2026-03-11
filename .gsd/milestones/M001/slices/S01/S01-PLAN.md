# S01: Convex Schema & Exercise Library

**Goal:** Deploy the full workout-domain Convex schema (7 tables with all indexes needed through S06), seed ~100-150 curated exercises, and deliver a working exercise browse page on the web app with muscle group/equipment filters and name search — auth-gated via Clerk.

**Demo:** Signed-in user navigates to `/exercises` on the web app, sees a list of 100+ exercises, can filter by muscle group dropdown, filter by equipment dropdown, and search by name. Filters combine. The page is behind Clerk auth (unauthenticated users are redirected to sign-in).

## Must-Haves

- Full Convex schema with 7 tables (`exercises`, `workouts`, `workoutExercises`, `sets`, `workoutTemplates`, `templateExercises`, `userPreferences`) with all indexes and search indexes needed through S06
- Curated JSON seed data with ~100-150 exercises covering major muscle groups and equipment types, each with name, slug, primaryMuscleGroup, secondaryMuscleGroups, equipment, exerciseType, instructions, defaultRestSeconds
- Idempotent seed mutation that loads exercises by checking slug existence before inserting
- `listExercises` query using `withIndex` for filter-only browsing and `withSearchIndex` for text search (both support muscle group and equipment filters)
- `getExercise` query to fetch a single exercise by ID
- Web `/exercises` route with filter dropdowns (muscle group, equipment), name search input, and exercise list with key details
- `/exercises` route protected via Clerk middleware
- `getUserId` helper extracted to a shared location for reuse across all Convex functions
- All weight stored in kg internally (D003)
- TypeScript compiles cleanly across all packages

## Proof Level

- This slice proves: **contract + integration**
- Real runtime required: **yes** — Convex deployment must accept the schema push, seed must run, queries must return correct filtered results, web page must render with live data
- Human/UAT required: **no** — functional correctness is verifiable by agent via browser + TypeScript compilation

## Verification

- `pnpm turbo typecheck` — all packages compile cleanly (schema, queries, web app types)
- `npx convex dev --once` in `packages/backend` — schema deploys without errors
- Seed exercises via Convex dashboard or function call, then verify query returns 100+ exercises
- Browser verification: navigate to `/exercises`, confirm exercises render, apply muscle group filter, apply equipment filter, type search query — all produce correct filtered results
- Browser verification: navigate to `/exercises` while signed out — redirected to Clerk sign-in

## Observability / Diagnostics

- Runtime signals: Convex function logs (visible in Convex dashboard) for seed mutation progress — logs count of exercises inserted vs skipped
- Inspection surfaces: Convex dashboard data browser for `exercises` table; `listExercises` query callable from dashboard with filter args
- Failure visibility: Seed mutation logs explicit error if exercise data is malformed; query functions return empty array (not crash) for no-match filters
- Redaction constraints: No secrets in exercise data; userId from Clerk auth is the only PII (standard Convex pattern)

## Integration Closure

- Upstream surfaces consumed: Clerk auth (existing `ConvexClientProvider`, `middleware.ts`), Convex runtime (existing `@packages/backend` setup), UI primitives (existing `button.tsx`, `cn()`, Tailwind 4 theme)
- New wiring introduced in this slice: `convex/schema.ts` (full domain schema replacing notes), `convex/exercises.ts` (queries), `convex/seed.ts` (internal mutation), `/exercises` route, middleware route protection for `/exercises` and `/workouts`
- What remains before the milestone is truly usable end-to-end: S02 (workout CRUD), S03 (full set tracking), S04 (rest timer), S05 (templates), S06 (mobile + polish)

## Tasks

- [x] **T01: Define full workout-domain Convex schema and curate exercise seed data** `est:1h`
  - Why: The schema is the foundation for every subsequent slice — all 7 tables, indexes, and search indexes must be defined upfront (Convex requires indexes at schema time). The seed JSON is the data contract for the exercise library.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/data/exercises.json`
  - Do: Replace the existing notes schema with the full 7-table workout domain schema per the research doc's design. Create `data/exercises.json` with ~120 curated exercises covering chest/back/shoulders/biceps/triceps/legs/core muscle groups and barbell/dumbbell/cable/machine/bodyweight/kettlebell equipment types. Each exercise needs name, slug, primaryMuscleGroup, secondaryMuscleGroups, equipment, exerciseType, instructions, defaultRestSeconds. Use consistent enum values. Extract `getUserId` helper to `convex/lib/auth.ts` for reuse.
  - Verify: `pnpm turbo typecheck` passes for `@packages/backend`
  - Done when: Schema defines all 7 tables with correct validators, indexes, and search index; exercise JSON has 100+ exercises with consistent field values; auth helper is in shared location

- [x] **T02: Implement exercise seed mutation and query functions** `est:45m`
  - Why: The seed mutation populates the database; the query functions are the boundary contract consumed by S02-S06 and the web UI in T03.
  - Files: `packages/backend/convex/seed.ts`, `packages/backend/convex/exercises.ts`, `packages/backend/convex/lib/auth.ts`
  - Do: Create `seed.ts` with an `internalMutation` that reads from the JSON data, checks each exercise by slug via `by_slug` index, and inserts only missing ones. Log inserted/skipped counts. Create `exercises.ts` with: `listExercises(filters)` query using `withIndex` for filter-only and `withSearchIndex` for text search, `getExercise(id)` query, and `createCustomExercise(...)` auth-gated mutation. All functions use the shared `getUserId` helper.
  - Verify: `pnpm turbo typecheck` passes; manually run seed via Convex dashboard and query exercises with filters
  - Done when: Seed mutation inserts all exercises idempotently; `listExercises` returns filtered results using indexes (not `.filter()`); `getExercise` returns a single exercise; `createCustomExercise` requires auth

- [x] **T03: Build exercise browse page with filters, search, and route protection** `est:1h`
  - Why: This is the user-facing deliverable — the exercise library must be browsable on web with real Convex data, behind Clerk auth.
  - Files: `apps/web/src/app/exercises/page.tsx`, `apps/web/src/components/exercises/ExerciseList.tsx`, `apps/web/src/components/exercises/ExerciseFilters.tsx`, `apps/web/src/components/exercises/ExerciseCard.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/app/layout.tsx`
  - Do: Add `/exercises` route as client component using `useQuery(api.exercises.listExercises)`. Build `ExerciseFilters` with muscle group dropdown, equipment dropdown, and search input — all as controlled state that becomes query args. Build `ExerciseCard` showing exercise name, primary muscle group, equipment, and type. Build `ExerciseList` composing filters + cards with empty state. Update Clerk middleware to protect `/exercises(.*)` and `/workouts(.*)`. Update layout metadata. Follow clean/minimal design (D007) using existing Tailwind 4 theme and CVA patterns.
  - Verify: `pnpm turbo typecheck` passes for web app; browser: exercise page renders with data, filters work, search works, signed-out redirect works
  - Done when: Authenticated user sees exercise list at `/exercises`, can filter by muscle group, filter by equipment, search by name; unauthenticated user is redirected to sign-in

- [x] **T04: End-to-end verification — seed, query, and browse** `est:30m`
  - Why: Proves the slice contract end-to-end: schema deployed, data seeded, queries correct, UI functional — all requirements (R001, R010, R023) verified.
  - Files: `packages/backend/scripts/verify-s01.ts`, `apps/web/src/app/exercises/page.tsx` (potential fixes)
  - Do: Write a verification script that uses the Convex client to: (1) call seed if exercises table is empty, (2) query `listExercises` with no filters and assert count >= 100, (3) query with `primaryMuscleGroup: "chest"` and assert all results have that muscle group, (4) query with `equipment: "barbell"` and assert all results have that equipment, (5) query with search text and assert results contain the search term. Then verify in the browser: exercise page loads, filters produce correct results, signed-out redirect works. Fix any issues discovered.
  - Verify: Verification script passes all assertions; browser verification passes
  - Done when: All R001 (exercise library), R010 (filtering), R023 (auth gating) requirements are demonstrably met

## Files Likely Touched

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/exercises.ts`
- `packages/backend/convex/seed.ts`
- `packages/backend/convex/lib/auth.ts`
- `packages/backend/data/exercises.json`
- `packages/backend/scripts/verify-s01.ts`
- `apps/web/src/app/exercises/page.tsx`
- `apps/web/src/components/exercises/ExerciseList.tsx`
- `apps/web/src/components/exercises/ExerciseFilters.tsx`
- `apps/web/src/components/exercises/ExerciseCard.tsx`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
