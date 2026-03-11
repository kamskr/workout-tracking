# S03: Full Set Tracking, Supersets & Previous Performance

**Goal:** Extend the workout logging flow with RPE/tempo/notes per set, superset exercise grouping, and inline previous performance display — all on web.
**Demo:** User logs a set with RPE 8, tempo "3-1-2-0", and a note. Two exercises are grouped into a superset with a visual indicator. When adding an exercise that was used in a prior completed workout, "Last: 3×10 @ 60kg" appears inline.

## Must-Haves

- `logSet` and `updateSet` mutations accept and persist `rpe`, `tempo`, `notes` fields
- RPE is validated (1-10 range, rejected if out of bounds)
- `setSupersetGroup` and `clearSupersetGroup` mutations set/clear `supersetGroupId` on workout exercises
- `getPreviousPerformance` query returns the most recent completed workout's sets for a given exercise and user
- `getPreviousPerformance` returns null gracefully for first-time exercises
- SetRow UI has RPE, tempo, and notes inputs following the existing onBlur save pattern (D021)
- WorkoutExerciseItem header shows previous performance inline ("Last: 3×10 @ 60kg")
- WorkoutExerciseList visually groups exercises sharing a `supersetGroupId`
- Superset creation via explicit "Create Superset" button (not drag-to-group) per research recommendation
- Verification script (`verify-s03.ts`) proves R003, R005, R007 programmatically
- `pnpm turbo typecheck` passes across all 3 packages

## Proof Level

- This slice proves: integration (backend mutations/queries + UI rendering with type-checked API bindings)
- Real runtime required: yes (Convex dev backend for verification script)
- Human/UAT required: no (programmatic verification + typecheck; browser auth limited by Clerk dev captcha)

## Verification

- `npx tsx packages/backend/scripts/verify-s03.ts` — programmatic script covering:
  - R003: Log set with RPE/tempo/notes → read back → verify round-trip. Update RPE/notes → verify partial update. RPE out-of-range → verify rejection.
  - R005: Set superset group on 2 exercises → read back → verify groupId. Clear group → verify cleared.
  - R007: Create completed workout with exercise+sets → create new workout with same exercise → query previous performance → verify returns correct set data. Query for never-done exercise → verify null.
- `pnpm turbo typecheck` — all 3 packages compile (backend, web-app, native-app)
- Diagnostic verification: `getPreviousPerformance` returns structured data including `exerciseName`, `sets` array with `weight`/`reps`, and `workoutDate` — verifiable via the script's checks.

## Observability / Diagnostics

- Runtime signals: All new mutations throw descriptive errors — "RPE must be between 1 and 10", "Workout exercise not found", "Workout does not belong to user". Consistent with S02 error patterns.
- Inspection surfaces: `npx tsx packages/backend/scripts/verify-s03.ts` — named checks with PASS/FAIL. Convex dashboard tables (`sets`, `workoutExercises`) show rpe/tempo/notes/supersetGroupId fields. `npx convex run sets:listSetsForExercise` for ad-hoc inspection.
- Failure visibility: Verification script exit code 0/1. Each check logs requirement ID, check name, and failure detail.
- Redaction constraints: None (no secrets in workout data).

## Integration Closure

- Upstream surfaces consumed:
  - `convex/sets.ts` — `logSet`, `updateSet`, `deleteSet`, `listSetsForExercise` (extended with new args)
  - `convex/workoutExercises.ts` — `addExerciseToWorkout`, `listExercisesForWorkout` (superset mutations added alongside)
  - `convex/workouts.ts` — `getWorkoutWithDetails` (read path already returns all set fields — no change needed)
  - `convex/testing.ts` — test helpers extended for S03 fields
  - `apps/web/src/components/workouts/SetRow.tsx`, `WorkoutExerciseItem.tsx`, `WorkoutExerciseList.tsx` — extended with new inputs and displays
  - `apps/web/src/lib/units.ts` — `formatWeight`, `displayWeight` for previous performance formatting
- New wiring introduced in this slice:
  - `getPreviousPerformance` query — new Convex query joining workoutExercises → workouts → sets for reverse lookup
  - `setSupersetGroup` / `clearSupersetGroup` mutations — new Convex mutations on workoutExercises
  - SetRow RPE/tempo/notes inputs — new input fields wired to extended `updateSet` mutation
  - Previous performance display in WorkoutExerciseItem — wired to `getPreviousPerformance` query via `useQuery`
  - Superset visual grouping in WorkoutExerciseList — grouping logic + "Create Superset" / "Remove Superset" UI
- What remains before the milestone is truly usable end-to-end:
  - S04: Rest timer integration
  - S05: Workout templates
  - S06: Mobile app + cross-platform polish + realtime sync verification

## Tasks

- [x] **T01: Extend backend mutations, add previous performance query, and create verification script** `est:35m`
  - Why: All three features (R003, R005, R007) need backend changes before UI can consume them. The verification script is created first to define the contract.
  - Files: `packages/backend/convex/sets.ts`, `packages/backend/convex/workoutExercises.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s03.ts`
  - Do: (1) Extend `logSet` and `updateSet` args with `rpe`, `tempo`, `notes`. Add RPE validation (1-10 clamp/reject). (2) Add `getPreviousPerformance` query to `sets.ts` — traverse `by_exerciseId` index on workoutExercises → filter by userId via workout lookup → find most recent completed → return sets. (3) Add `setSupersetGroup` and `clearSupersetGroup` mutations to `workoutExercises.ts`. (4) Extend `testLogSet` in `testing.ts` to accept `rpe`, `tempo`, `notes`. Add `testSetSupersetGroup`, `testClearSupersetGroup`, `testGetPreviousPerformance` helpers. (5) Create `verify-s03.ts` with checks for R003 (round-trip, partial update, RPE validation), R005 (set/clear superset group), R007 (previous performance with data + null case).
  - Verify: `pnpm turbo typecheck` passes, then `npx tsx packages/backend/scripts/verify-s03.ts` — all checks pass.
  - Done when: All verify-s03 checks pass (R003, R005, R007 proven at integration level).

- [x] **T02: Extend SetRow with RPE, tempo, notes inputs and update type interfaces** `est:25m`
  - Why: R003 requires UI for the new set fields. SetRow is the component that renders each set's inputs. The `SetData` interface is duplicated in 3 files — all must be updated.
  - Files: `apps/web/src/components/workouts/SetRow.tsx`, `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `apps/web/src/components/workouts/WorkoutExerciseList.tsx`
  - Do: (1) Update `SetData` interface in all 3 files to include `rpe?: number`, `tempo?: string`, `notes?: string`. (2) Add RPE number input (1-10), tempo text input, and notes text input to SetRow using the existing onBlur save pattern (D021). RPE and tempo inline with weight/reps; notes as an expandable row below. (3) Update set header row labels in WorkoutExerciseItem to include RPE column. (4) Wire all new inputs to `updateSet` mutation with the new args.
  - Verify: `pnpm turbo typecheck` passes. Visual: inputs appear in SetRow with correct labels.
  - Done when: SetRow renders RPE, tempo, notes inputs. Typing a value and blurring saves to Convex via `updateSet`.

- [x] **T03: Add previous performance display, superset grouping UI, and final typecheck** `est:30m`
  - Why: R007 (previous performance) and R005 (superset UI) are the remaining user-facing features. This task wires the `getPreviousPerformance` query into WorkoutExerciseItem and adds superset grouping controls + visual grouping to WorkoutExerciseList.
  - Files: `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `apps/web/src/components/workouts/WorkoutExerciseList.tsx`
  - Do: (1) In WorkoutExerciseItem, call `useQuery(api.sets.getPreviousPerformance, { exerciseId })` and display result below exercise name as "Last: 3×10 @ 60kg" (using `formatWeight`/`displayWeight` for unit-awareness). Handle null case (no previous data) gracefully. (2) In WorkoutExerciseList, group exercises by `supersetGroupId` — render exercises sharing a group in a bordered container with a "Superset" badge. (3) Add "Create Superset" button that appears when 2+ exercises are selected via checkboxes. Add "Remove from Superset" button per grouped exercise. Wire to `setSupersetGroup` and `clearSupersetGroup` mutations. (4) Run `pnpm turbo typecheck` to confirm all 3 packages compile cleanly.
  - Verify: `pnpm turbo typecheck` passes. `npx tsx packages/backend/scripts/verify-s03.ts` still passes (no backend regression).
  - Done when: Previous performance text appears in exercise header. Superset grouping UI works (create group, visual grouping, remove from group). All packages typecheck.

## Files Likely Touched

- `packages/backend/convex/sets.ts`
- `packages/backend/convex/workoutExercises.ts`
- `packages/backend/convex/testing.ts`
- `packages/backend/scripts/verify-s03.ts`
- `apps/web/src/components/workouts/SetRow.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx`
