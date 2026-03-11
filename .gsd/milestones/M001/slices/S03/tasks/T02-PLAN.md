---
estimated_steps: 4
estimated_files: 3
---

# T02: Extend SetRow with RPE, tempo, notes inputs and update type interfaces

**Slice:** S03 — Full Set Tracking, Supersets & Previous Performance
**Milestone:** M001

## Description

Add RPE, tempo, and notes input fields to the SetRow component, following the existing onBlur save pattern (D021). Update the duplicated `SetData` interface in all three workout components that define it (SetRow, WorkoutExerciseItem, WorkoutExerciseList). All new inputs wire to the already-extended `updateSet` mutation from T01.

## Steps

1. **Update `SetData` interface in all 3 files** — Add `rpe?: number`, `tempo?: string`, `notes?: string` to the `SetData` interface in `SetRow.tsx`, `WorkoutExerciseItem.tsx`, and `WorkoutExerciseList.tsx`. These fields are already returned by `getWorkoutWithDetails` (Convex returns full documents), so no query changes are needed.

2. **Add RPE input to SetRow** — Add a number input for RPE (1-10) inline next to the reps input. Use local state + onBlur save pattern matching weight/reps. Display placeholder "RPE". Size: narrow (w-16). On blur, call `updateSet({ setId, rpe: parsedValue })`. Handle empty input gracefully (don't save undefined RPE if user clears it — use `updateSet` with rpe omitted, or set to undefined if API supports clearing).

3. **Add tempo and notes inputs to SetRow** — Add tempo as a small text input inline (placeholder "Tempo e.g. 3-1-2-0", w-24). Add notes as a collapsible row below the main set row — a small toggle icon that expands a text input. Use onBlur save pattern for both. Notes input should be a full-width text input when expanded.

4. **Update set header row in WorkoutExerciseItem** — Add "RPE" and "Tempo" column headers to match the new SetRow layout. Adjust column widths so the row doesn't feel cramped — weight and reps remain the primary columns, RPE and tempo are narrower secondary columns.

## Must-Haves

- [ ] `SetData` interface updated in all 3 files with `rpe`, `tempo`, `notes`
- [ ] RPE input renders in SetRow with onBlur save to `updateSet`
- [ ] Tempo input renders in SetRow with onBlur save to `updateSet`
- [ ] Notes input renders in SetRow (collapsible) with onBlur save to `updateSet`
- [ ] Set header row labels in WorkoutExerciseItem match new column layout
- [ ] `pnpm turbo typecheck` passes

## Verification

- `pnpm turbo typecheck` — all 3 packages compile with no errors
- Visual inspection: SetRow renders RPE and tempo inputs inline, notes toggle expands a text row
- Functional: onBlur on RPE/tempo/notes inputs calls `updateSet` with correct args (confirmed via typecheck — api.sets.updateSet now accepts these fields from T01)

## Observability Impact

- Signals added/changed: None — UI-only changes using existing mutation API
- How a future agent inspects this: `pnpm turbo typecheck` confirms API binding correctness. Component source shows input fields and onBlur handlers.
- Failure state exposed: TypeScript compilation errors if SetData interface or updateSet args are mismatched

## Inputs

- `packages/backend/convex/sets.ts` — T01 extended `updateSet` accepting rpe, tempo, notes
- `apps/web/src/components/workouts/SetRow.tsx` — existing component with weight/reps inputs
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — existing component with set header row
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — existing component with SetData interface

## Expected Output

- `apps/web/src/components/workouts/SetRow.tsx` — extended with RPE, tempo, notes inputs using onBlur save pattern
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — updated SetData interface + set header labels
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — updated SetData interface
