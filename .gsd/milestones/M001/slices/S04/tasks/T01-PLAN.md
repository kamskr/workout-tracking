---
estimated_steps: 5
estimated_files: 5
---

# T01: Backend mutations, verification script, and timer utility

**Slice:** S04 — Rest Timer
**Milestone:** M001

## Description

Create the two new Convex mutations needed for rest timer configuration (`updateRestSeconds` on workoutExercises, `setDefaultRestSeconds` on userPreferences), add corresponding test helpers to `testing.ts`, build a verification script proving the backend contracts, and add a `formatRestTime` utility to `units.ts`. This establishes the backend foundation and verification baseline before any UI work.

The schema already has all required fields (`workoutExercises.restSeconds`, `userPreferences.defaultRestSeconds`, `exercises.defaultRestSeconds`). No schema changes needed — only new mutations to write to existing fields.

## Steps

1. **Add `updateRestSeconds` mutation to `workoutExercises.ts`** — accepts `workoutExerciseId` + `restSeconds` (number or undefined to clear). Auth-gated, verifies ownership via existing `verifyWorkoutOwnershipAndStatus` helper. Patches the `restSeconds` field on the workoutExercise document.

2. **Add `setDefaultRestSeconds` mutation to `userPreferences.ts`** — accepts `defaultRestSeconds` (number). Follows the existing upsert pattern from `setUnitPreference`. Creates or patches userPreferences with the new value.

3. **Add test helpers to `testing.ts`** — `testUpdateRestSeconds(testUserId, workoutExerciseId, restSeconds)` and `testSetDefaultRestSeconds(testUserId, defaultRestSeconds)`. Follow existing patterns (public mutations with `testUserId` arg bypassing auth).

4. **Create `verify-s04.ts` verification script** — follows the exact pattern from `verify-s02.ts` / `verify-s03.ts`. Checks:
   - R004-1: `updateRestSeconds` sets restSeconds on a workoutExercise (set to 90, read back, verify === 90)
   - R004-2: `updateRestSeconds` with undefined clears restSeconds (set to undefined, read back, verify === undefined)
   - R004-3: `setDefaultRestSeconds` sets defaultRestSeconds on userPreferences (set to 120, read back, verify === 120)
   - R004-4: Rest priority chain — when workoutExercise.restSeconds is set, it takes precedence over exercise.defaultRestSeconds and userPreferences.defaultRestSeconds
   - R004-5: Rest priority chain — when workoutExercise.restSeconds is undefined, exercise.defaultRestSeconds is used
   - R004-6: Rest priority chain — when both overrides are undefined, userPreferences.defaultRestSeconds is used
   - Cleanup at end via `testCleanup`

5. **Add `formatRestTime(seconds)` to `units.ts`** — returns "M:SS" format (e.g., 90 → "1:30", 5 → "0:05", 0 → "0:00"). Used by RestTimerDisplay in T02.

## Must-Haves

- [ ] `updateRestSeconds` mutation deployed and auth-gated with ownership check
- [ ] `setDefaultRestSeconds` mutation deployed with upsert pattern
- [ ] Test helpers in testing.ts for both mutations
- [ ] verify-s04.ts passes all checks against live Convex backend
- [ ] `formatRestTime` utility returns correct "M:SS" format for edge cases (0, single-digit seconds, > 60s)
- [ ] `pnpm turbo typecheck` passes

## Verification

- `npx tsx packages/backend/scripts/verify-s04.ts` — all checks pass (exit 0)
- `pnpm turbo typecheck` — all 3 packages compile with zero errors

## Observability Impact

- Signals added/changed: Both new mutations throw descriptive errors on ownership failure ("Workout exercise not found", "does not belong to user"). Same pattern as existing S02 mutations.
- How a future agent inspects this: `verify-s04.ts` script (exit 0/1 with named check output). Convex dashboard to inspect `workoutExercises.restSeconds` and `userPreferences.defaultRestSeconds` values directly.
- Failure state exposed: Verification script prints PASS/FAIL for each named check with detail string. Script exits non-zero on any failure.

## Inputs

- `packages/backend/convex/schema.ts` — `workoutExercises.restSeconds` (optional number) and `userPreferences.defaultRestSeconds` (optional number) already defined
- `packages/backend/convex/workoutExercises.ts` — existing ownership verification pattern (`verifyWorkoutOwnershipAndStatus`)
- `packages/backend/convex/userPreferences.ts` — existing upsert pattern (`setUnitPreference`)
- `packages/backend/convex/testing.ts` — existing test helper patterns
- `packages/backend/scripts/verify-s02.ts` and `verify-s03.ts` — verification script patterns
- `apps/web/src/lib/units.ts` — existing utility file with `formatDuration`

## Expected Output

- `packages/backend/convex/workoutExercises.ts` — new `updateRestSeconds` mutation added
- `packages/backend/convex/userPreferences.ts` — new `setDefaultRestSeconds` mutation added
- `packages/backend/convex/testing.ts` — new `testUpdateRestSeconds` and `testSetDefaultRestSeconds` helpers added
- `packages/backend/scripts/verify-s04.ts` — new verification script with 6 named checks, all passing
- `apps/web/src/lib/units.ts` — new `formatRestTime(seconds: number): string` function added
