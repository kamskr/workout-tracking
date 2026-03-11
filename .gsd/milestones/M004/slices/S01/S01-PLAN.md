# S01: Leaderboards — Backend + Web UI

**Goal:** Pre-computed leaderboard entries updated on workout completion, queryable top-N rankings with opt-in filtering, and a web UI at `/leaderboards` showing ranked entries by exercise, metric, and time period.
**Demo:** A user visits the Leaderboards page on web, sees top-10 rankings for Bench Press 1RM across multiple users, filters by exercise and time period, and their own rank is displayed — all backed by pre-computed leaderboard entries updated on workout completion.

## Must-Haves

- `leaderboardEntries` table in schema with `by_exerciseId_metric_period_value` composite index (exerciseId, metric, period, value) for top-N `.order("desc").take(N)` queries
- `leaderboardOptIn: v.optional(v.boolean())` field on `profiles` table (undefined = not opted in, D109)
- `updateLeaderboardEntries(db, userId, workoutId)` helper in `convex/lib/leaderboardCompute.ts` that computes e1RM/volume/reps per exercise and upserts leaderboard entries
- Non-fatal leaderboard hook in `finishWorkout` (second try/catch block after feed item creation, D108)
- `getLeaderboard` query returning top-N entries with opt-in post-filtering (take `limit * 3`, filter by profile `leaderboardOptIn`, D114)
- `getMyRank` query returning caller's rank via bounded `.take(1000)` scan (D114)
- `setLeaderboardOptIn` mutation toggling opt-in on profiles
- `getLeaderboardExercises` query returning exercises that have leaderboard entries
- Leaderboard entry cascade-delete in `deleteWorkout`
- `testCleanup` extended to delete `leaderboardEntries` by userId
- Test helpers: `testSetLeaderboardOptIn`, `testGetLeaderboard`, `testGetMyRank`, `testUpdateLeaderboardEntries`
- Verification script `verify-s01-m04.ts` with 5+ test users proving ranking correctness, opt-in filtering, metric accuracy
- Web UI at `/leaderboards` with exercise selector, metric picker, period picker, top-N table, "my rank" callout
- Profile page leaderboard opt-in toggle
- `/leaderboards(.*)` added to middleware protected routes

## Proof Level

- This slice proves: integration (real mutation chains: finishWorkout → leaderboard entry upsert → getLeaderboard returns updated ranking)
- Real runtime required: yes (Convex dev backend via ConvexHttpClient for verification script)
- Human/UAT required: yes (web UI visual assessment for leaderboard page layout and interactions)

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m04.ts` — 12+ checks across 5 test users proving:
  - LB-01: Leaderboard entries created on workout completion
  - LB-02: e1RM metric computed correctly (Epley formula)
  - LB-03: Volume metric excludes warmup sets
  - LB-04: Reps metric tracks max single-set reps
  - LB-05: Opt-in user appears in getLeaderboard results
  - LB-06: Non-opted-in user excluded from getLeaderboard results
  - LB-07: Rankings ordered correctly (highest value first)
  - LB-08: getMyRank returns correct position for opted-in user
  - LB-09: getMyRank returns null/not-ranked for non-opted-in user
  - LB-10: Period-filtered leaderboard filters by updatedAt
  - LB-11: Leaderboard entries deleted on workout deletion
  - LB-12: getLeaderboardExercises returns only exercises with entries
- `cd packages/backend && npx tsc --noEmit` — 0 new errors
- `cd apps/web && npx tsc --noEmit` — 0 new errors (excluding pre-existing clsx TS2307)
- Structured error logging: `[Leaderboard]` prefixed console.error in non-fatal hook

## Observability / Diagnostics

- Runtime signals: `[Leaderboard] Error updating entries for workout ${workoutId}: ${err}` — structured console.error in finishWorkout non-fatal hook (matches existing `[Feed Item]` pattern)
- Inspection surfaces: `getLeaderboard` query returns `{ entries, totalEntries }` — totalEntries shows pre-filter count for diagnosing opt-in ratio issues; `getMyRank` returns `{ rank, value, totalScanned }` for scan diagnostics
- Failure visibility: Non-fatal hook logs error but workout completion succeeds — failure is visible only in Convex dashboard logs. Leaderboard entry `updatedAt` timestamp enables staleness detection.
- Redaction constraints: None — leaderboard data is public for opted-in users

## Integration Closure

- Upstream surfaces consumed:
  - `packages/backend/convex/schema.ts` — profiles table (add `leaderboardOptIn` field)
  - `packages/backend/convex/workouts.ts` — `finishWorkout` mutation (add leaderboard hook), `deleteWorkout` mutation (add cascade)
  - `packages/backend/convex/lib/prDetection.ts` — `estimateOneRepMax` function (reuse for e1RM metric)
  - `packages/backend/convex/testing.ts` — `testCleanup` (extend), add leaderboard test helpers
  - `apps/web/src/middleware.ts` — add `/leaderboards(.*)` to protected routes
- New wiring introduced in this slice:
  - `leaderboardEntries` table + composite index (new schema surface consumed by S02-S04)
  - `finishWorkout` → `updateLeaderboardEntries` hook (new mutation chain)
  - `leaderboards.ts` Convex module with 4 functions (new API surface consumed by web UI and S04 mobile)
  - `/leaderboards` Next.js route (new page)
  - Profile opt-in toggle (new profile UI element)
- What remains before the milestone is truly usable end-to-end:
  - S02: Group challenges (crons.ts, challenge lifecycle)
  - S03: Achievements & badges (badge definitions, profile badge display)
  - S04: Mobile port of all competitive features

## Tasks

- [x] **T01: Schema + leaderboard compute helper + finishWorkout hook** `est:45m`
  - Why: Establishes the `leaderboardEntries` table, the core computation logic, and wires it into workout completion — the foundational data pipeline that all other tasks build on.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/lib/leaderboardCompute.ts`, `packages/backend/convex/workouts.ts`
  - Do: Add `leaderboardEntries` table with composite index to schema. Add `leaderboardOptIn` field to profiles. Create `updateLeaderboardEntries` helper that traverses workout exercises/sets, computes e1RM/volume/reps, and upserts entries. Add non-fatal try/catch block in `finishWorkout` after feed item creation. Add leaderboard entry cascade-delete in `deleteWorkout`. Entries always created regardless of opt-in (opt-in filtered at query time per research).
  - Verify: `cd packages/backend && npx tsc --noEmit` — 0 errors
  - Done when: Schema has leaderboardEntries table with correct composite index, finishWorkout calls updateLeaderboardEntries in non-fatal block, deleteWorkout cascade-deletes leaderboard entries, TypeScript compiles clean.

- [x] **T02: Leaderboard queries + test helpers + verification script** `est:50m`
  - Why: Exposes the leaderboard data through auth-gated queries and test helpers, then proves correctness with a multi-user verification script — this is the primary proof of the ranking system.
  - Files: `packages/backend/convex/leaderboards.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s01-m04.ts`
  - Do: Create `leaderboards.ts` with `getLeaderboard`, `getMyRank`, `setLeaderboardOptIn`, `getLeaderboardExercises` queries/mutations. Add test helpers to `testing.ts` (testSetLeaderboardOptIn, testGetLeaderboard, testGetMyRank, testUpdateLeaderboardEntries, testCleanup extension for leaderboardEntries). Write `verify-s01-m04.ts` with 12 checks across 5 test users.
  - Verify: `cd packages/backend && npx tsc --noEmit` — 0 errors. Script file exists with 12+ named checks.
  - Done when: All 4 leaderboard Convex functions exist, test helpers cover all functions, verification script has 12 checks covering ranking, opt-in filtering, metrics, deletion cascade, and period filtering. TypeScript compiles clean.

- [x] **T03: Web UI — leaderboards page + profile opt-in toggle** `est:45m`
  - Why: Delivers the user-facing leaderboard page and profile opt-in control — the visible product outcome of S01.
  - Files: `apps/web/src/app/leaderboards/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/middleware.ts`
  - Do: Create `/leaderboards` page with exercise selector (only exercises with entries), metric picker (e1RM/Volume/Reps), period picker (7d/30d/All Time), top-10 table with rank/user/value columns, "My Rank" callout card. Add leaderboard opt-in toggle to profile page (own profile only). Add `/leaderboards(.*)` to middleware protected routes. Use `data-leaderboard-page`, `data-leaderboard-table`, `data-leaderboard-rank`, `data-leaderboard-optin` attributes.
  - Verify: `cd apps/web && npx tsc --noEmit` — 0 new errors. Leaderboard page renders at `/leaderboards` with all pickers and table. Profile page shows opt-in toggle.
  - Done when: Leaderboard page is fully functional with exercise/metric/period pickers, ranked table, my-rank callout. Profile page has opt-in toggle. Middleware protects the route. TypeScript compiles clean across web package.

## Files Likely Touched

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/lib/leaderboardCompute.ts` (new)
- `packages/backend/convex/workouts.ts`
- `packages/backend/convex/leaderboards.ts` (new)
- `packages/backend/convex/testing.ts`
- `packages/backend/scripts/verify-s01-m04.ts` (new)
- `apps/web/src/app/leaderboards/page.tsx` (new)
- `apps/web/src/app/profile/[username]/page.tsx`
- `apps/web/src/middleware.ts`
