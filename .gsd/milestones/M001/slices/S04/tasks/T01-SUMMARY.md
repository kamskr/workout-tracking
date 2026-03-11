---
id: T01
parent: S04
milestone: M001
provides:
  - updateRestSeconds mutation on workoutExercises (auth-gated, ownership-checked)
  - setDefaultRestSeconds mutation on userPreferences (upsert pattern)
  - Test helpers for both mutations in testing.ts
  - verify-s04.ts verification script (6 checks, all passing)
  - formatRestTime utility function in units.ts
key_files:
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/userPreferences.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s04.ts
  - apps/web/src/lib/units.ts
key_decisions: []
patterns_established:
  - updateRestSeconds follows same ownership verification pattern as existing WE mutations (get WE → verifyWorkoutOwnershipAndStatus)
  - setDefaultRestSeconds follows existing setUnitPreference upsert pattern exactly
  - testUpdateRestSeconds and testSetDefaultRestSeconds follow established testing.ts patterns (public mutations with testUserId)
observability_surfaces:
  - verify-s04.ts script (exit 0/1 with 6 named PASS/FAIL checks)
  - Mutations throw descriptive errors: "Workout exercise not found", "Workout does not belong to user", "Workout is not in progress"
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Backend mutations, verification script, and timer utility

**Added `updateRestSeconds` and `setDefaultRestSeconds` mutations, test helpers, verification script (6/6 pass), and `formatRestTime` utility.**

## What Happened

Implemented the backend foundation for the rest timer feature:

1. **`updateRestSeconds` mutation** in `workoutExercises.ts` — accepts `workoutExerciseId` + optional `restSeconds`. Auth-gated via `getUserId`, verifies ownership and in-progress status via `verifyWorkoutOwnershipAndStatus`. Patches the `restSeconds` field (number to set, undefined to clear).

2. **`setDefaultRestSeconds` mutation** in `userPreferences.ts` — accepts `defaultRestSeconds` (number). Follows the identical upsert pattern from `setUnitPreference`: queries by userId, patches if exists, inserts with default `weightUnit: "kg"` if not.

3. **Test helpers** in `testing.ts` — `testUpdateRestSeconds(testUserId, workoutExerciseId, restSeconds)` and `testSetDefaultRestSeconds(testUserId, defaultRestSeconds)`. Both follow existing patterns (public mutations with `testUserId` arg bypassing auth).

4. **`verify-s04.ts` verification script** — follows exact pattern from verify-s03.ts. Runs 6 named checks against live Convex backend proving both mutations work and the rest duration priority chain resolves correctly.

5. **`formatRestTime(seconds)` utility** in `units.ts` — returns "M:SS" format (e.g., 90 → "1:30", 5 → "0:05", 0 → "0:00"). Handles negative input gracefully.

## Verification

- `npx tsx packages/backend/scripts/verify-s04.ts` — **6/6 checks pass** (exit 0):
  - R004-1: updateRestSeconds sets restSeconds on workoutExercise ✅
  - R004-2: updateRestSeconds with undefined clears restSeconds ✅
  - R004-3: setDefaultRestSeconds sets defaultRestSeconds on userPreferences ✅
  - R004-4: WE restSeconds takes precedence over exercise default and user pref ✅
  - R004-5: When WE restSeconds is undefined, exercise.defaultRestSeconds is used ✅
  - R004-6: Priority chain resolves correctly for fallback scenario ✅
- `pnpm turbo typecheck` — **3/3 packages pass** with zero errors

### Slice-level verification (partial — T01 of 3):
- [x] `pnpm turbo typecheck` — all 3 packages compile
- [x] `npx tsx packages/backend/scripts/verify-s04.ts` — all checks pass
- [ ] TypeScript compilation of RestTimerContext, RestTimerDisplay, and integration points (T02/T03)

## Diagnostics

- Run `npx tsx packages/backend/scripts/verify-s04.ts` against a live Convex backend to verify both mutations and the priority chain.
- Convex dashboard can inspect `workoutExercises.restSeconds` and `userPreferences.defaultRestSeconds` values directly.
- Both mutations throw descriptive errors on ownership failure.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/workoutExercises.ts` — added `updateRestSeconds` mutation
- `packages/backend/convex/userPreferences.ts` — added `setDefaultRestSeconds` mutation
- `packages/backend/convex/testing.ts` — added `testUpdateRestSeconds` and `testSetDefaultRestSeconds` helpers
- `packages/backend/scripts/verify-s04.ts` — new verification script with 6 checks
- `apps/web/src/lib/units.ts` — added `formatRestTime(seconds)` utility function
