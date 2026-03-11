---
id: S03
parent: M001
milestone: M001
provides:
  - logSet/updateSet with rpe, tempo, notes fields + server-side RPE validation (1-10)
  - getPreviousPerformance query (most recent completed workout sets for a given exercise/user)
  - setSupersetGroup/clearSupersetGroup mutations for workoutExercises
  - SetRow UI with RPE, tempo, and notes inputs (onBlur save pattern)
  - Previous performance inline display in WorkoutExerciseItem ("Last: 3×10 @ 60 kg")
  - Superset visual grouping in WorkoutExerciseList with creation/removal controls
  - verify-s03.ts verification script proving R003, R005, R007 (12 checks)
requires:
  - slice: S01
    provides: exercises table with by_exerciseId index, exercise seed data
  - slice: S02
    provides: workout/set CRUD mutations, active workout UI, SetRow with onBlur save pattern (D021), testing.ts internal helpers
affects:
  - S04 (superset rest timer sharing deferred)
  - S06 (mobile UI rebuild of RPE/tempo/notes, superset grouping, previous performance)
key_files:
  - packages/backend/convex/sets.ts
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03.ts
  - apps/web/src/components/workouts/SetRow.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
key_decisions:
  - D023: Superset UX — explicit "Create Superset" button with checkbox selection (not drag-to-group)
  - D024: Previous performance query — multi-table traversal, no denormalization
  - D025: RPE validation — server-side rejection for values outside 1-10
  - D026: Tempo input — freeform string, no structured parsing
  - D027: Previous performance formatting — consecutive identical sets grouped with count prefix
  - D028: Superset visual grouping — 6-color rotating left-border palette, discriminated union render items
  - D029: Set notes UI — collapsible row below main set row via toggle icon
patterns_established:
  - RPE validation shared between auth-gated mutations and test helpers via same logic
  - getPreviousPerformance traverses by_exerciseId index → workout ownership check → completedAt sort → set fetch
  - RPE/tempo/notes follow same local-state + onBlur save pattern as weight/reps (D021)
  - Collapsible secondary row pattern for per-set notes toggle
  - formatPreviousPerformance helper groups consecutive identical sets with unit-aware display
  - Selection mode pattern: local Set<Id> state + selectionMode boolean toggle, floating action button
  - Discriminated union render items for single vs superset exercise grouping
observability_surfaces:
  - verify-s03.ts with 12 named checks covering R003 (4), R005 (2), R007 (6)
  - "RPE must be between 1 and 10" error on validation failure
  - getPreviousPerformance returns structured { exerciseName, sets, workoutDate, workoutName } or null
  - useQuery(getPreviousPerformance) subscriptions visible in Convex dashboard
  - setSupersetGroup/clearSupersetGroup mutations in Convex function history
  - workoutExercises table shows supersetGroupId values in Convex dashboard
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
duration: ~42m
verification_result: passed
completed_at: 2026-03-11
---

# S03: Full Set Tracking, Supersets & Previous Performance

**Extended workout logging with RPE/tempo/notes per set, superset exercise grouping with visual indicators, and inline previous performance display — all wired end-to-end from Convex backend to web UI.**

## What Happened

Three features were delivered across 3 tasks:

**T01 — Backend (R003, R005, R007):** Extended `logSet` and `updateSet` mutations with `rpe`, `tempo`, `notes` optional fields. Added `validateRpe()` helper that rejects values outside 1-10 with a descriptive error. Created `getPreviousPerformance` auth-gated query that traverses `workoutExercises` (by_exerciseId index) → workout ownership/completion filter → most recent completed workout → returns structured set data with exercise name and dates. Added `setSupersetGroup` (batch sets groupId on multiple workout exercises with ownership verification) and `clearSupersetGroup` (clears single exercise's groupId) mutations. Extended `testing.ts` with `testUpdateSet`, `testSetSupersetGroup`, `testClearSupersetGroup`, `testGetPreviousPerformance` internal helpers. Created `verify-s03.ts` with 12 checks proving all three requirements at integration level.

**T02 — SetRow UI (R003):** Updated `SetData` interface across all 3 workout components with `rpe?`, `tempo?`, `notes?` fields. Added RPE (narrow number input, 1-10 clamped), tempo (text input), and notes (collapsible row with toggle icon) to SetRow. All follow the existing onBlur save pattern (D021). Added RPE/Tempo column headers to WorkoutExerciseItem.

**T03 — Previous Performance + Superset UI (R005, R007):** Wired `useQuery(getPreviousPerformance)` into WorkoutExerciseItem — shows "Last: 3×10 @ 60 kg" below exercise name with unit-aware formatting via `formatWeight`. Consecutive identical sets grouped with count prefixes. "First time! 🎉" badge for new exercises. Added superset visual grouping to WorkoutExerciseList using a discriminated union of render items (single vs superset). Grouped exercises render in 6-color rotating bordered containers with "Superset" badge. "Group Superset" toggle enters selection mode with checkboxes on ungrouped exercises; 2+ selected shows floating "Create Superset" button. "Remove from superset" per-exercise in groups. Exported shared `ExerciseItemData`/`SetData` types from WorkoutExerciseItem to eliminate duplication.

## Verification

- `pnpm turbo typecheck` — ✅ all 3 packages compile (backend, web-app, native-app)
- `npx tsx packages/backend/scripts/verify-s03.ts` — ✅ 12/12 checks pass
  - R003: round-trip (rpe=8, tempo="3-1-2-0", notes="felt good"), partial update (rpe=9, notes changed, tempo preserved), RPE=11 rejected, RPE=0 rejected
  - R005: setSupersetGroup on 2 exercises, clearSupersetGroup clears one while other retains
  - R007: getPreviousPerformance returns 3 sets with correct weights/reps/exercise name/workout date/name, returns null for never-done exercise
- `npx tsx packages/backend/scripts/verify-s02.ts` — ✅ 15/15 checks pass (no regression)
- Browser UI verification blocked by Clerk dev mode CAPTCHA — documented in plan as expected limitation

## Requirements Advanced

- R003 — Full Set Tracking: advanced from active → validated. logSet/updateSet accept RPE/tempo/notes with server-side validation. Web UI renders all inputs.
- R005 — Superset Grouping: advanced from active → validated. Backend mutations set/clear superset groups. Web UI groups exercises visually with creation and removal controls.
- R007 — Previous Performance: advanced from active → validated. getPreviousPerformance query returns structured data from most recent completed workout. Web UI displays inline with unit-aware formatting.

## Requirements Validated

- R003 — RPE/tempo/notes round-trip, partial update, and RPE validation proven by verify-s03.ts (4 checks) + typecheck
- R005 — Superset set/clear mutations proven by verify-s03.ts (2 checks) + typecheck
- R007 — Previous performance query data correctness and null handling proven by verify-s03.ts (6 checks) + typecheck

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- R005 note: "Grouped exercises share rest timers" deferred to S04 (rest timer slice). S03 proves the grouping data model and UI, not shared timer behavior.

## Deviations

- Browser-based visual verification could not be completed due to Clerk dev mode Cloudflare CAPTCHA blocking automated sign-up/sign-in. This was expected and documented in the slice plan's proof level. Full API contract verification via scripts and typecheck compensates.
- Added `testUpdateSet` helper to `testing.ts` — required because verify scripts use test user IDs and can't call auth-gated mutations directly. Same pattern as existing helpers.
- Removed duplicate `SetData`/`ExerciseItemData` interfaces from WorkoutExerciseList — now imports from WorkoutExerciseItem for DRY.

## Known Limitations

- Single-member superset groups: removing exercises can leave 1 exercise visually in a superset container. Users can clear it via "Remove from superset" button. Acceptable for M001.
- Previous performance query is O(N) where N = total workoutExercise rows for an exercise across all users. Acceptable for M001 single-user scale. Revisit if >100ms in production (D024).
- Tempo is freeform string with no structured validation (D026). Analytics on tempo data will require parsing later.
- Browser UI not visually verified due to Clerk CAPTCHA — functionality proven via programmatic verification and typecheck.

## Follow-ups

- S04: Superset rest timer sharing (R005 partial — "grouped exercises share rest timers")
- S06: Mobile UI rebuild of RPE/tempo/notes inputs, superset grouping, and previous performance display

## Files Created/Modified

- `packages/backend/convex/sets.ts` — Extended logSet/updateSet with rpe/tempo/notes + RPE validation. Added getPreviousPerformance query.
- `packages/backend/convex/workoutExercises.ts` — Added setSupersetGroup and clearSupersetGroup mutations.
- `packages/backend/convex/testing.ts` — Extended testLogSet with rpe/tempo/notes. Added testUpdateSet, testSetSupersetGroup, testClearSupersetGroup, testGetPreviousPerformance helpers.
- `packages/backend/scripts/verify-s03.ts` — New verification script with 12 checks for R003, R005, R007.
- `apps/web/src/components/workouts/SetRow.tsx` — Added RPE, tempo, notes inputs with onBlur save. Notes as collapsible row.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Added previous performance display, RPE/Tempo column headers, exported shared types.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — Added superset visual grouping, selection mode, create/remove superset controls. Imports shared types.

## Forward Intelligence

### What the next slice should know
- SetRow now has 6 input fields per set (weight, reps, RPE, tempo, notes toggle, warmup toggle, delete). The row is getting wide — future additions should consider column priority or responsive hiding.
- `getPreviousPerformance` is called once per exercise in the active workout via `useQuery`. Each call creates a Convex subscription. For workouts with many exercises, this could mean 8-10 active subscriptions — should be fine but worth monitoring.
- The "Group Superset" selection mode uses local component state. It doesn't persist — navigating away and back resets selection. This is intentional.

### What's fragile
- `SetData` interface is now defined in `SetRow.tsx` and imported by the other two components — a single source of truth. If the Convex `sets` table schema changes, only `SetRow.tsx` needs updating, but the import chain must be verified.
- Previous performance formatting assumes `sets` array in the response has `weight` and `reps` as numbers. If the sets schema adds new required fields, `formatPreviousPerformance` may need updating.

### Authoritative diagnostics
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12 checks covering all three S03 requirements. If this passes, the backend contract is intact.
- `pnpm turbo typecheck` — confirms all API bindings between web UI and Convex backend are type-correct.

### What assumptions changed
- No significant assumptions changed. All three features were implemented as planned. The verification script pattern from S02 carried over cleanly to S03.
