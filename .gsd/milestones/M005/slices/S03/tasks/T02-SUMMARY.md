---
id: T02
parent: S03
milestone: M005
provides:
  - testFinishWorkoutWithAllHooks mutation (calls finishWorkoutCore with all 4 hooks)
  - testGetFeedItemsForWorkout query (by workoutId index)
  - testEndSession now calls finishWorkoutCore sweep (matches production)
  - testCheckSessionTimeouts now calls finishWorkoutCore sweep (matches production)
  - verify-s03-m05.ts with 15 checks (SS-23 through SS-37)
key_files:
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03-m05.ts
key_decisions:
  - Updated testEndSession and testCheckSessionTimeouts to also call finishWorkoutCore (matching production sessions.ts behavior), rather than relying solely on the standalone testFinishWorkoutWithAllHooks helper — this ensures verification scripts that use testEndSession exercise the real hook pipeline
patterns_established:
  - Test session helpers mirror production session helpers including hook pipelines (not just status transitions)
observability_surfaces:
  - "[Session] testEndSession" structured log with finished workout count
  - "[Session] testCheckSessionTimeouts" structured log with finished workout count per auto-completed session
duration: 15min
verification_result: passed
completed_at: 2026-03-11T16:28:00+01:00
blocker_discovered: false
---

# T02: Add testFinishWorkoutWithAllHooks helper and comprehensive verification script

**Added `testFinishWorkoutWithAllHooks`, `testGetFeedItemsForWorkout`, updated `testEndSession`/`testCheckSessionTimeouts` to call `finishWorkoutCore`, and created `verify-s03-m05.ts` with 15 checks (SS-23–SS-37) covering the full session→workout→hooks integration lifecycle.**

## What Happened

1. Added `testFinishWorkoutWithAllHooks` mutation to testing.ts — accepts `{ testUserId, id }`, calls `finishWorkoutCore(ctx.db, userId, workoutId)` which runs all 4 hooks (feed, leaderboard, challenge, badge). Idempotent via finishWorkoutCore's built-in guard.

2. Added `testGetFeedItemsForWorkout` query to testing.ts — queries `feedItems.by_workoutId` index for a specific workout, enabling verification scripts to confirm feed item creation without feed pagination.

3. Updated `testEndSession` to include the `finishWorkoutCore` sweep for all in-progress participant workouts, matching the production `endSession` behavior from T01. Per-participant try/catch with structured logging.

4. Updated `testCheckSessionTimeouts` to include the `finishWorkoutCore` sweep for auto-completed sessions, matching the production `checkSessionTimeouts` behavior from T01. Per-participant try/catch with structured logging.

5. Created `verify-s03-m05.ts` with 15 independent checks covering:
   - SS-23: Workout completion after endSession (status + durationSeconds)
   - SS-24: Feed item creation per participant
   - SS-25: Leaderboard entry creation per participant
   - SS-26: Badge evaluation (first_workout badge)
   - SS-27: Left participant's workout completed by endSession
   - SS-28: endSession idempotency (no duplicate feed items)
   - SS-29: Auto-timeout workout completion (checkSessionTimeouts)
   - SS-30: S01 regression (create/join/sets)
   - SS-31: S02 regression (timer start/pause + end session)
   - SS-32: Session summary per-participant stats
   - SS-33: No-exercises participant completed cleanly
   - SS-34: Session workout in participant's workout list
   - SS-35: sessionId foreign key intact after completion
   - SS-36: Standalone testFinishWorkoutWithAllHooks with all 4 hooks
   - SS-37: Cleanup runs without errors

6. No changes needed to `_generated/api.d.ts` — it uses `ApiFromModules<{ testing: typeof testing }>` which auto-derives types from all exports.

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors
- `grep -c 'SS-' packages/backend/scripts/verify-s03-m05.ts` — 64 (15 unique SS- markers)
- `grep -o 'SS-[0-9]*' packages/backend/scripts/verify-s03-m05.ts | sort -u` — SS-23 through SS-37 (all 15)
- `grep 'testFinishWorkoutWithAllHooks\|testGetFeedItemsForWorkout' packages/backend/convex/testing.ts | wc -l` — 2 export definitions
- All 3 verify scripts (S01, S02, S03) compile without errors
- testEndSession and testCheckSessionTimeouts both include finishWorkoutCore calls

### Slice-level checks status (intermediate task):
- ✅ `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors
- ⏳ `pnpm -C apps/web exec tsc --noEmit` — not yet checked (T03 scope)
- ⏳ `pnpm -C apps/native exec tsc --noEmit` — not yet checked (T03 scope)
- ✅ `verify-s03-m05.ts` compiles and defines 15+ checks (SS-23 through SS-37)
- ✅ `verify-s01-m05.ts` and `verify-s02-m05.ts` still compile
- ✅ `finishWorkoutCore` is importable from `convex/lib/finishWorkoutCore.ts`
- ✅ `endSession` includes per-participant `finishWorkoutCore` calls (production)
- ✅ `testEndSession` includes per-participant `finishWorkoutCore` calls (test)
- ✅ `checkSessionTimeouts` includes per-participant workout finishing (production)
- ✅ `testCheckSessionTimeouts` includes per-participant workout finishing (test)
- ⏳ "Start Group Session" button — T03 scope
- ✅ SS-28 validates idempotent endSession (no duplicate feed items)

## Diagnostics

- Run `npx tsx packages/backend/scripts/verify-s03-m05.ts` against a live Convex backend to see pass/fail for each of the 15 checks
- Each check prints `✅ SS-XX: description` or `❌ SS-XX: description → reason`
- Script reports total pass/fail count at the end with exit code 0 (all pass) or 1 (failures)
- Filter Convex function logs for `[Session] testEndSession` to see workout completion counts
- Filter for `[Session] testCheckSessionTimeouts` to see auto-completed session workout finish counts

## Deviations

- Updated `testEndSession` and `testCheckSessionTimeouts` to call `finishWorkoutCore` (not in original plan but necessary to match production behavior and make the verification script work correctly). Without this, SS-23/24/25/26/27/29 checks would fail because the test helpers wouldn't run the hooks.
- No changes to `_generated/api.d.ts` were needed — the file auto-derives types from module exports via `ApiFromModules`. The plan stated "Add the 2 new testing exports to api.d.ts" but this is unnecessary with the existing auto-generation pattern.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/testing.ts` — Added `testFinishWorkoutWithAllHooks` mutation, `testGetFeedItemsForWorkout` query, updated `testEndSession` and `testCheckSessionTimeouts` to call `finishWorkoutCore`
- `packages/backend/scripts/verify-s03-m05.ts` — New 15-check verification script (SS-23 through SS-37)
