---
estimated_steps: 5
estimated_files: 4
---

# T01: Extend backend mutations, add previous performance query, and create verification script

**Slice:** S03 — Full Set Tracking, Supersets & Previous Performance
**Milestone:** M001

## Description

Extend the existing Convex backend to support all three S03 features (RPE/tempo/notes on sets, superset grouping, previous performance lookup) and create the verification script that proves R003, R005, R007 at integration level. This task establishes the backend contract that T02 and T03 will consume.

## Steps

1. **Extend `logSet` and `updateSet` in `convex/sets.ts`** — Add `rpe: v.optional(v.number())`, `tempo: v.optional(v.string())`, `notes: v.optional(v.string())` to both mutation args. In `logSet`, include these fields in the insert. In `updateSet`, add them to the partial patch logic. Add RPE validation in both: if `rpe` is provided and not in 1-10 range, throw `"RPE must be between 1 and 10"`.

2. **Add `getPreviousPerformance` query to `convex/sets.ts`** — New auth-gated query accepting `{ exerciseId: v.id("exercises") }`. Implementation: query `workoutExercises` via `by_exerciseId` index → for each result, fetch the parent workout → filter for `userId === currentUser` and `status === "completed"` → sort by `completedAt` desc → take the first match → fetch its sets via `by_workoutExerciseId` index → return `{ exerciseName, sets: [{setNumber, weight, reps, rpe, tempo}], workoutDate, workoutName }` or `null`. Include the exercise name for display convenience.

3. **Add `setSupersetGroup` and `clearSupersetGroup` mutations to `convex/workoutExercises.ts`** — `setSupersetGroup` accepts `{ workoutExerciseIds: v.array(v.id("workoutExercises")), supersetGroupId: v.string() }`, verifies ownership of each via the parent workout, patches `supersetGroupId` on each. `clearSupersetGroup` accepts `{ workoutExerciseId: v.id("workoutExercises") }`, verifies ownership, patches `supersetGroupId` to `undefined`.

4. **Extend test helpers in `convex/testing.ts`** — Add `rpe`, `tempo`, `notes` optional args to `testLogSet`. Add `testSetSupersetGroup(testUserId, workoutExerciseIds, supersetGroupId)`, `testClearSupersetGroup(testUserId, workoutExerciseId)`, and `testGetPreviousPerformance(testUserId, exerciseId)` helpers that bypass auth.

5. **Create `packages/backend/scripts/verify-s03.ts`** — Following the verify-s02.ts pattern: connect via ConvexHttpClient, clean up test data, then run checks:
   - **R003 checks:** (a) Log set with rpe=8, tempo="3-1-2-0", notes="felt good" → getWorkoutWithDetails → verify fields round-trip. (b) UpdateSet to change rpe=9, notes="heavy" → verify partial update preserved other fields. (c) Log set with rpe=11 → verify error thrown ("RPE must be between 1 and 10"). (d) Log set with rpe=0 → verify error thrown.
   - **R005 checks:** (a) Add 2 exercises, call testSetSupersetGroup with a groupId → getWorkoutWithDetails → verify both workoutExercises have matching supersetGroupId. (b) Call testClearSupersetGroup on one → verify cleared, other still has groupId.
   - **R007 checks:** (a) Create workout 1 with exercise A + 3 sets (60kg/10, 65kg/8, 70kg/6), finish it. Create workout 2 with same exercise A → call testGetPreviousPerformance → verify returns 3 sets with correct weights/reps and workout date. (b) Call testGetPreviousPerformance for an exercise never done → verify returns null.

## Must-Haves

- [ ] `logSet` accepts and persists `rpe`, `tempo`, `notes`
- [ ] `updateSet` accepts and patches `rpe`, `tempo`, `notes` (partial update)
- [ ] RPE validation rejects values outside 1-10 in both `logSet` and `updateSet`
- [ ] `getPreviousPerformance` query returns correct sets from most recent completed workout
- [ ] `getPreviousPerformance` returns null for exercises the user has never done
- [ ] `setSupersetGroup` sets `supersetGroupId` on multiple workout exercises
- [ ] `clearSupersetGroup` removes `supersetGroupId` from a workout exercise
- [ ] All verify-s03 checks pass

## Verification

- `pnpm turbo typecheck` — all 3 packages compile
- `npx tsx packages/backend/scripts/verify-s03.ts` — all checks pass (exit 0)
- `npx tsx packages/backend/scripts/verify-s02.ts` — still passes (no regression)

## Observability Impact

- Signals added/changed: New error message "RPE must be between 1 and 10" on validation failure. `getPreviousPerformance` returns structured data or null (inspectable via Convex dashboard or CLI).
- How a future agent inspects this: Run `verify-s03.ts` for full contract check. Use `npx convex run sets:listSetsForExercise` to inspect individual set fields. Use `npx convex run testing:testGetPreviousPerformance` for ad-hoc previous performance checks.
- Failure state exposed: Verification script logs each check with PASS/FAIL, requirement ID, and failure detail.

## Inputs

- `packages/backend/convex/sets.ts` — existing `logSet`, `updateSet`, `listSetsForExercise` mutations/queries
- `packages/backend/convex/workoutExercises.ts` — existing mutations (add, remove, reorder, list)
- `packages/backend/convex/testing.ts` — existing test helpers from S02
- `packages/backend/scripts/verify-s02.ts` — pattern for verification script
- `packages/backend/convex/schema.ts` — schema already has rpe, tempo, notes on sets and supersetGroupId on workoutExercises

## Expected Output

- `packages/backend/convex/sets.ts` — extended mutations + new `getPreviousPerformance` query
- `packages/backend/convex/workoutExercises.ts` — new `setSupersetGroup` and `clearSupersetGroup` mutations
- `packages/backend/convex/testing.ts` — extended `testLogSet` + new S03 test helpers
- `packages/backend/scripts/verify-s03.ts` — passing verification script proving R003, R005, R007
