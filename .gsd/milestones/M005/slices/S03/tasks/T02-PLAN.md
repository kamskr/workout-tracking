---
estimated_steps: 5
estimated_files: 3
---

# T02: Add testFinishWorkoutWithAllHooks helper and comprehensive verification script

**Slice:** S03 — Integration Hardening & Verification
**Milestone:** M005

## Description

The existing `testFinishWorkout` only creates feed items — it doesn't call leaderboard, challenge, or badge hooks. This task adds `testFinishWorkoutWithAllHooks` that calls the new `finishWorkoutCore`, adds a `testGetFeedItemsForWorkout` query helper for verification, updates `_generated/api.d.ts`, and creates the comprehensive `verify-s03-m05.ts` with 15 checks covering the full session integration lifecycle.

## Steps

1. **Add `testFinishWorkoutWithAllHooks` to testing.ts** — New mutation accepting `{ testUserId, id: v.id("workouts") }` that imports and calls `finishWorkoutCore(ctx.db, args.testUserId, args.id)`. Returns `{ completedAt, durationSeconds }`. This is the test equivalent of the production `finishWorkout` with all 4 hooks, callable without Clerk auth.

2. **Add `testGetFeedItemsForWorkout` to testing.ts** — New query accepting `{ workoutId: v.id("workouts") }` that queries `feedItems.by_workoutId` and returns all feed items for a specific workout. This enables the verification script to check that feed items were created for session participants without needing the full feed pagination flow.

3. **Update `_generated/api.d.ts`** — Add the 2 new testing exports (`testFinishWorkoutWithAllHooks`, `testGetFeedItemsForWorkout`) to the testing module registration. Follow the existing pattern for how test helpers are registered.

4. **Write `verify-s03-m05.ts`** — Comprehensive verification script with 15 checks:
   - **SS-23:** After `testEndSession`, each participant's workout status is "completed" with durationSeconds > 0
   - **SS-24:** After `testEndSession`, feed items exist for each participant (via `testGetFeedItemsForWorkout`)
   - **SS-25:** After `testEndSession`, leaderboard entries exist for participant exercises (via `testGetLeaderboard`)
   - **SS-26:** After `testEndSession`, badge evaluation ran — at least `first_workout` badge awarded (via `testGetUserBadges`)
   - **SS-27:** Participant who left before endSession has their workout completed by endSession
   - **SS-28:** endSession is idempotent — second call doesn't create duplicate feed items (query feed items count before/after)
   - **SS-29:** Auto-timeout (`testCheckSessionTimeouts`) also completes participant workouts (creates feed items)
   - **SS-30:** Session create + join + heartbeat + set log regression (lightweight S01 coverage)
   - **SS-31:** Timer start + pause + end session regression (lightweight S02 coverage)
   - **SS-32:** Session summary reflects correct per-participant stats after endSession with workout completion
   - **SS-33:** Session with participant who has no exercises/sets — workout still completed cleanly (completedAt set, durationSeconds ≥ 0)
   - **SS-34:** Session workout appears in participant's `testListWorkouts` after completion
   - **SS-35:** Session workout's `sessionId` foreign key intact after completion
   - **SS-36:** `testFinishWorkoutWithAllHooks` runs all 4 hooks (feed + leaderboard + badge) for a standalone workout
   - **SS-37:** cleanup runs for both test users without errors

   Script follows established pattern: `ConvexHttpClient`, `check()` function, cleanup at start and end, unique test user IDs (`test-s03-host`, `test-s03-joiner`).

5. **Verify compilation** — Run tsc on backend to confirm testing.ts and verify-s03-m05.ts both compile. Verify S01 and S02 verification scripts still compile.

## Must-Haves

- [ ] `testFinishWorkoutWithAllHooks` exported from testing.ts calling `finishWorkoutCore`
- [ ] `testGetFeedItemsForWorkout` exported from testing.ts querying by workoutId
- [ ] `_generated/api.d.ts` updated with both new exports
- [ ] `verify-s03-m05.ts` defines 15 checks (SS-23 through SS-37)
- [ ] Script uses unique test user IDs (`test-s03-host`, `test-s03-joiner`)
- [ ] Script includes cleanup at start and end
- [ ] All 3 verification scripts (S01, S02, S03) still compile

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors
- `grep -c 'SS-' packages/backend/scripts/verify-s03-m05.ts` — at least 15
- `grep 'testFinishWorkoutWithAllHooks\|testGetFeedItemsForWorkout' packages/backend/convex/testing.ts | wc -l` — at least 2 export lines
- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` compiles with verify-s01, verify-s02, verify-s03 all present

## Observability Impact

- Signals added/changed: None (test helpers don't add production signals)
- How a future agent inspects this: Run `npx tsx packages/backend/scripts/verify-s03-m05.ts` against a live Convex backend to see pass/fail for each of the 15 checks. Each check prints `✅ SS-XX: description` or `❌ SS-XX: description — reason`.
- Failure state exposed: Each check is independent — a failure in SS-24 doesn't block SS-25. The script reports total pass/fail count at the end.

## Inputs

- `packages/backend/convex/lib/finishWorkoutCore.ts` — T01 output: the shared hook function to import
- `packages/backend/convex/testing.ts` — Existing 92 exports, 11 session helpers
- `packages/backend/scripts/verify-s01-m05.ts` — 12-check template for script pattern
- `packages/backend/scripts/verify-s02-m05.ts` — 10-check template for script pattern
- `packages/backend/convex/_generated/api.d.ts` — Current type registrations

## Expected Output

- `packages/backend/convex/testing.ts` — Extended with `testFinishWorkoutWithAllHooks` and `testGetFeedItemsForWorkout` (~60 lines added)
- `packages/backend/convex/_generated/api.d.ts` — Updated with 2 new testing exports
- `packages/backend/scripts/verify-s03-m05.ts` — New: ~500-600 line verification script with 15 checks
