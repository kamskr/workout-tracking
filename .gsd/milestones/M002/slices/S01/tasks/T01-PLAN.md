---
estimated_steps: 5
estimated_files: 3
---

# T01: Add personalRecords schema, test helpers, and verification script skeleton

**Slice:** S01 — Personal Records — Detection & Live Notification
**Milestone:** M002

## Description

Establish the data foundation for PR tracking: add the `personalRecords` table to the Convex schema, add required indexes (including `by_userId_completedAt` on `workouts` for S02/S03), extend `testing.ts` with PR-related test helpers and cleanup cascade, and create the verification script skeleton with all checks defined (initially failing).

## Steps

1. **Add `personalRecords` table to `schema.ts`** — Define the table per D044/S01 research: `userId`, `exerciseId`, `type` (weight/volume/reps), `value`, `setId`, `workoutId`, `achievedAt`. Add indexes `by_userId_exerciseId` (compound on `userId`, `exerciseId`) and `by_workoutId`. Also add `by_userId_completedAt` composite index to the `workouts` table (roadmap boundary deliverable for S02/S03).

2. **Add test helpers to `testing.ts`** — Add `testGetWorkoutPRs(testUserId, workoutId)` query that reads `personalRecords` by `by_workoutId` index and joins exercise names. Add `testGetPersonalRecords(testUserId, exerciseId)` query that reads PRs by `by_userId_exerciseId`. Update `testCleanup` to cascade-delete all `personalRecords` for the test user (query all workouts → get their IDs → query `personalRecords` by `by_workoutId` for each, delete. Also query `personalRecords` by `by_userId_exerciseId` as a sweep).

3. **Run `pnpm turbo typecheck --force`** to confirm schema and test helpers compile with 0 errors across all 3 packages.

4. **Push schema to Convex dev** — Run `npx convex dev --once` (or equivalent) from `packages/backend` to deploy the schema change.

5. **Write `verify-s01-m02.ts` verification script** — Follow the verify-s05.ts pattern exactly (ConvexHttpClient, `check()` function, cleanup). Define ≥10 checks covering all PR detection scenarios (weight PR baseline, weight PR update, volume PR, rep PR, warmup skip, missing weight skip, correct metadata, `getWorkoutPRs` filtering, `getPersonalRecords` correctness, no false PR). The checks call test helper mutations/queries that don't exist yet for PR detection — the script will run but checks will fail. This is expected and correct.

## Must-Haves

- [ ] `personalRecords` table in schema with correct fields and both indexes
- [ ] `by_userId_completedAt` index on `workouts` table
- [ ] `testGetWorkoutPRs` and `testGetPersonalRecords` helpers in testing.ts
- [ ] `testCleanup` cascade-deletes `personalRecords`
- [ ] `verify-s01-m02.ts` with ≥10 defined checks
- [ ] TypeScript compiles with 0 errors (`pnpm turbo typecheck --force`)

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — script runs (checks may fail since PR detection isn't implemented yet, but no crashes)
- Schema deployed to Convex dev successfully

## Observability Impact

- Signals added/changed: `personalRecords` table becomes inspectable in Convex dashboard — agents can query it directly to audit PR state
- How a future agent inspects this: `testGetPersonalRecords` and `testGetWorkoutPRs` queries provide programmatic access to PR data without auth
- Failure state exposed: `testCleanup` deletes PR records, so test isolation is maintained between runs

## Inputs

- `packages/backend/convex/schema.ts` — current schema (7 tables, no `personalRecords`)
- `packages/backend/convex/testing.ts` — current test helpers (no PR-related functions)
- `packages/backend/scripts/verify-s05.ts` — pattern reference for verify script structure
- S01-RESEARCH.md — schema definition, PR type enum, index design

## Expected Output

- `packages/backend/convex/schema.ts` — updated with `personalRecords` table + `by_userId_completedAt` on workouts
- `packages/backend/convex/testing.ts` — extended with `testGetWorkoutPRs`, `testGetPersonalRecords`, updated `testCleanup`
- `packages/backend/scripts/verify-s01-m02.ts` — new file, ≥10 checks defined, runnable
