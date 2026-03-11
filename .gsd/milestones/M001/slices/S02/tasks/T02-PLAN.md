---
estimated_steps: 4
estimated_files: 2
---

# T02: Programmatic verification script for all S02 backend functions

**Slice:** S02 — Workout CRUD & Active Workout Session
**Milestone:** M001

## Description

Create a verification script that exercises all S02 Convex functions end-to-end against the live backend, proving R002 (workout CRUD), R008 (unit preference), and R009 (duration tracking) at the integration level. Follows the `verify-s01.ts` pattern. Since workout mutations are auth-gated and `ConvexHttpClient` can't easily provide Clerk auth tokens, the script will use Convex `internalMutation`/`internalQuery` wrappers that bypass auth for testing — these are internal-only functions not exposed to clients.

## Steps

1. **Create internal test helpers in `convex/testing.ts`** — Define `internalMutation` and `internalQuery` wrappers that call the same logic as the public functions but skip the `getUserId` check by accepting a `testUserId` arg directly. Functions needed: `testCreateWorkout`, `testFinishWorkout`, `testDeleteWorkout`, `testGetWorkoutWithDetails`, `testListWorkouts`, `testAddExercise`, `testLogSet`, `testSetUnitPreference`, `testGetPreferences`. These use `internalMutation`/`internalQuery` from Convex (same as `seed.ts` pattern) so they are not callable from the client. Keep them thin — they call `ctx.db` directly with the same logic, just substituting a hardcoded test userId instead of auth.

2. **Create `packages/backend/scripts/verify-s02.ts`** — Verification script using `ConvexHttpClient`. Structure:
   - **R009 — Duration tracking**: Create workout (get startedAt), wait 1-2 seconds, finish it, verify `durationSeconds >= 1`.
   - **R002 — Workout CRUD**: Create workout → add 2 exercises (use first 2 from `listExercises`) → log 3 sets on first exercise with weight/reps → verify set count → finish workout → verify `getWorkoutWithDetails` returns workout + 2 exercises + 3 sets + exercise names → verify `listWorkouts` includes it → delete workout → verify it's gone.
   - **R008 — Unit preference**: Set preference to "lbs" → get preference → verify "lbs" → set back to "kg" → verify "kg".
   - Each step is a named check with PASS/FAIL output, matching `verify-s01.ts` format.
   - Clean up: delete test workout at end (or in finally block).

3. **Handle the auth bypass** — All `internal*` functions in `convex/testing.ts` accept `testUserId: v.string()` as an arg. The verification script passes a deterministic test user ID (e.g. `"test-user-verify-s02"`). This is safe because internal functions are not exposed to the client API.

4. **Run and verify** — Execute `npx tsx packages/backend/scripts/verify-s02.ts`, confirm all checks pass with exit code 0.

## Must-Haves

- [ ] Script exercises full workout lifecycle: create → add exercises → log sets → finish → list → details → delete
- [ ] Script verifies `durationSeconds` is computed server-side and is > 0 (R009)
- [ ] Script verifies unit preference CRUD (R008)
- [ ] Script verifies `getWorkoutWithDetails` returns joined data with exercise names and sets
- [ ] All test data is cleaned up after the script runs (no leftover test workouts)
- [ ] Internal test functions use `internalMutation`/`internalQuery` (not exposed to client API)
- [ ] Script outputs structured PASS/FAIL per check, matching `verify-s01.ts` format
- [ ] Script exits 0 on all pass, 1 on any failure

## Verification

- `npx tsx packages/backend/scripts/verify-s02.ts` — exits 0 with all checks passing
- `pnpm turbo typecheck` — no type errors introduced

## Observability Impact

- Signals added/changed: `convex/testing.ts` adds internal-only test helpers — these are diagnostic surfaces for future verification.
- How a future agent inspects this: Run `npx tsx packages/backend/scripts/verify-s02.ts` for a fast pass/fail check on all S02 backend contracts. Exit code 0 = healthy.
- Failure state exposed: Each check prints `✅ PASS` or `❌ FAIL` with detail string. Failed checks print the specific assertion that broke.

## Inputs

- `packages/backend/convex/workouts.ts` — functions to exercise (from T01)
- `packages/backend/convex/workoutExercises.ts` — functions to exercise (from T01)
- `packages/backend/convex/sets.ts` — functions to exercise (from T01)
- `packages/backend/convex/userPreferences.ts` — functions to exercise (from T01)
- `packages/backend/convex/exercises.ts` — `listExercises` to get exercise IDs for testing
- `packages/backend/scripts/verify-s01.ts` — pattern to follow for script structure

## Expected Output

- `packages/backend/convex/testing.ts` — internal-only test helper functions (not client-exposed)
- `packages/backend/scripts/verify-s02.ts` — programmatic verification script with ~10 named checks covering R002, R008, R009
