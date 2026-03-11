---
id: T01
parent: S03
milestone: M001
provides:
  - logSet/updateSet with rpe, tempo, notes fields + RPE validation
  - getPreviousPerformance query (most recent completed workout sets for an exercise)
  - setSupersetGroup/clearSupersetGroup mutations for workoutExercises
  - testUpdateSet, testSetSupersetGroup, testClearSupersetGroup, testGetPreviousPerformance test helpers
  - verify-s03.ts verification script proving R003, R005, R007
key_files:
  - packages/backend/convex/sets.ts
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03.ts
key_decisions:
  - Added validateRpe helper function in sets.ts for DRY RPE validation (1-10 range)
  - testUpdateSet added to testing.ts since verify scripts use test user IDs and can't call auth-gated mutations
patterns_established:
  - RPE validation is shared between auth-gated mutations and test helpers via same logic (throw "RPE must be between 1 and 10")
  - getPreviousPerformance traverses by_exerciseId index → workout ownership check → completedAt sort → set fetch
observability_surfaces:
  - "RPE must be between 1 and 10" error on validation failure
  - getPreviousPerformance returns structured { exerciseName, sets, workoutDate, workoutName } or null
  - verify-s03.ts with 12 named checks covering R003 (4), R005 (2), R007 (6)
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Extend backend mutations, add previous performance query, and create verification script

**Extended logSet/updateSet with rpe/tempo/notes fields, added getPreviousPerformance query, setSupersetGroup/clearSupersetGroup mutations, and verify-s03.ts proving R003, R005, R007 at integration level.**

## What Happened

Extended the Convex backend with all three S03 features:

1. **RPE/tempo/notes on sets (R003):** Added `rpe`, `tempo`, `notes` optional args to both `logSet` and `updateSet` mutations. Added `validateRpe()` helper that throws "RPE must be between 1 and 10" for values outside 1-10. Both mutations include these fields in insert/patch.

2. **Previous performance lookup (R007):** Added `getPreviousPerformance` auth-gated query to `sets.ts`. It queries `workoutExercises` via `by_exerciseId` index, fetches parent workouts, filters for the user's completed workouts, sorts by `completedAt` desc, and returns the sets from the most recent match along with exercise name, workout date, and workout name. Returns null if no completed workouts exist for the exercise.

3. **Superset grouping (R005):** Added `setSupersetGroup` (accepts array of workoutExerciseIds + groupId string, verifies ownership of each) and `clearSupersetGroup` (accepts single workoutExerciseId, patches supersetGroupId to undefined) mutations to `workoutExercises.ts`.

4. **Test helpers:** Extended `testLogSet` with rpe/tempo/notes args and RPE validation. Added `testUpdateSet`, `testSetSupersetGroup`, `testClearSupersetGroup`, and `testGetPreviousPerformance` to `testing.ts`.

5. **Verification script:** Created `verify-s03.ts` following the verify-s02.ts pattern with 12 checks across R003, R005, R007.

## Verification

- `pnpm turbo typecheck` — all 3 packages compile (backend, web-app, native-app) ✅
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 checks pass ✅
  - R003: round-trip (rpe=8, tempo="3-1-2-0", notes="felt good"), partial update (rpe=9, notes changed, tempo preserved), RPE=11 rejected, RPE=0 rejected
  - R005: setSupersetGroup on 2 exercises, clearSupersetGroup clears one while other retains
  - R007: getPreviousPerformance returns 3 sets with correct weights/reps/exercise name/workout date/name, returns null for never-done exercise
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 checks pass (no regression) ✅

## Diagnostics

- Run `npx tsx packages/backend/scripts/verify-s03.ts` for full contract check
- Use `npx convex run testing:testGetPreviousPerformance` for ad-hoc previous performance checks
- Convex dashboard tables (`sets`, `workoutExercises`) show rpe/tempo/notes/supersetGroupId fields
- Error "RPE must be between 1 and 10" on validation failure in logSet/updateSet/testLogSet/testUpdateSet

## Deviations

- Added `testUpdateSet` helper to `testing.ts` — not explicitly called out in the task plan but required because the verify script uses test user IDs and can't call the auth-gated `api.sets.updateSet` mutation directly. Same pattern as existing test helpers.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/sets.ts` — Extended logSet/updateSet with rpe/tempo/notes args + RPE validation. Added getPreviousPerformance query.
- `packages/backend/convex/workoutExercises.ts` — Added setSupersetGroup and clearSupersetGroup mutations.
- `packages/backend/convex/testing.ts` — Extended testLogSet with rpe/tempo/notes. Added testUpdateSet, testSetSupersetGroup, testClearSupersetGroup, testGetPreviousPerformance helpers.
- `packages/backend/scripts/verify-s03.ts` — New verification script with 12 checks for R003, R005, R007.
