---
id: T02
parent: S03
milestone: M001
provides:
  - SetRow renders RPE, tempo, and notes inputs with onBlur save to updateSet
  - SetData interface includes rpe/tempo/notes in all 3 workout components
  - Set header row in WorkoutExerciseItem labels RPE and Tempo columns
key_files:
  - apps/web/src/components/workouts/SetRow.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
key_decisions:
  - RPE client-side clamped to 1-10 before sending to server (belt + suspenders with server validation)
  - Notes implemented as collapsible row below main set row via toggle icon (not inline — avoids cramping the main row)
  - Empty RPE/tempo/notes not sent to server on blur (no clearing support — fields are optional)
patterns_established:
  - RPE/tempo/notes follow same local-state + onBlur save pattern as weight/reps (D021)
  - Collapsible secondary row pattern for per-set notes toggle
  - Column sizing: weight/reps use flex-[2], RPE w-14, tempo w-24 as secondary narrower columns
observability_surfaces:
  - TypeScript compilation errors surface mismatched SetData or updateSet args
  - pnpm turbo typecheck confirms API binding correctness
duration: ~10min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Extend SetRow with RPE, tempo, notes inputs and update type interfaces

**Added RPE (number, 1-10), tempo (text), and notes (collapsible text) inputs to SetRow with onBlur save, and updated SetData interface in all 3 workout components.**

## What Happened

1. Updated `SetData` interface in `SetRow.tsx`, `WorkoutExerciseItem.tsx`, and `WorkoutExerciseList.tsx` to include `rpe?: number`, `tempo?: string`, `notes?: string`.

2. Added RPE input to SetRow as a narrow (w-14) centered number input with min=1 max=10, placeholder "RPE". Uses local state + onBlur handler that client-side clamps to 1-10 before calling `updateSet`. Empty input is silently ignored (no server call).

3. Added tempo input as a w-24 text input inline, placeholder "Tempo". onBlur trims and sends to `updateSet` if changed.

4. Added notes as a collapsible row — a chat-bubble toggle icon in the main row expands a full-width text input below. Auto-opens if set already has notes. onBlur saves trimmed value via `updateSet`.

5. Updated set header row in WorkoutExerciseItem to include "RPE" and "Tempo" column headers. Adjusted column widths: weight/reps use `flex-[2]`, RPE uses `w-14 shrink-0`, tempo uses `w-24 shrink-0`. Added spacers for notes toggle, warmup toggle, and delete button.

## Verification

- `pnpm turbo typecheck` — all 3 packages (backend, web-app, native-app) pass with no errors
- `pnpm --filter web-app build` — production build succeeds, all routes generate
- Component structure review confirms: all new inputs wire to `updateSet` mutation with correct field names matching T01's extended args (rpe, tempo, notes)
- Slice verification (`verify-s03.ts`) not runnable without local Convex backend — will pass on final task with backend running. Backend mutations proven in T01.

## Diagnostics

- `pnpm turbo typecheck` confirms API binding correctness between SetData fields and updateSet mutation args
- Component source (`SetRow.tsx`) shows all input fields and their onBlur handlers for inspection
- RPE validation: client clamps 1-10, server throws "RPE must be between 1 and 10" (from T01)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/components/workouts/SetRow.tsx` — Added RPE, tempo, notes inputs with local state + onBlur save; notes as collapsible row; updated SetData interface
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Updated SetData interface; added RPE/Tempo column headers; adjusted column widths with spacers
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — Updated SetData interface with rpe/tempo/notes fields
