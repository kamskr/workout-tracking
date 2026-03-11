---
id: T03
parent: S03
milestone: M001
provides:
  - Previous performance display in WorkoutExerciseItem header (R007) with unit-aware formatting
  - Superset visual grouping in WorkoutExerciseList with colored left-border containers and badge (R005)
  - "Group Superset" selection mode with checkbox selection and "Create Superset" floating button
  - "Remove from superset" button per exercise in superset group
  - ExerciseItemData type export from WorkoutExerciseItem for shared interface
key_files:
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
key_decisions:
  - Previous performance formatted as grouped summary ("3×10 @ 60 kg, 3×8 @ 65 kg") — consecutive identical sets merged with count prefix
  - "First time!" badge shown when getPreviousPerformance returns null (query resolved but no data)
  - Selection mode toggle ("Group Superset" button) rather than always-visible checkboxes — reduces visual noise
  - Only ungrouped exercises are selectable for new superset creation (already-grouped exercises excluded)
  - Superset colors cycle through 6-color palette (violet, amber, emerald, rose, sky, orange)
  - ExerciseItemData interface extended with optional supersetGroupId on workoutExercise, exported as shared type
patterns_established:
  - formatPreviousPerformance helper groups consecutive identical sets and uses formatWeight for unit-aware display
  - Superset visual grouping pattern: group by supersetGroupId in render-item discriminated union (single vs superset)
  - Selection mode pattern: local Set<Id> state + selectionMode boolean toggle, floating action button when threshold met
observability_surfaces:
  - useQuery(getPreviousPerformance) subscriptions visible in Convex dashboard function logs
  - setSupersetGroup/clearSupersetGroup mutations logged in Convex function history
  - Superset groupId values visible in workoutExercises table in Convex dashboard
  - verify-s03.ts covers all backend contracts (12/12 checks)
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Add previous performance display, superset grouping UI, and final typecheck

**Wired getPreviousPerformance query into WorkoutExerciseItem for inline "Last: ..." display, added superset visual grouping with create/remove controls to WorkoutExerciseList, and confirmed all 3 packages typecheck with zero regressions.**

## What Happened

1. **Previous performance display (R007):** Added `useQuery(api.sets.getPreviousPerformance)` to WorkoutExerciseItem. When data exists, shows "Last: 3×10 @ 60 kg, 3×8 @ 65 kg" below the exercise name using `formatWeight` for unit-awareness. Consecutive identical sets are grouped with count prefixes. When the query returns null (first-time exercise), shows a "First time! 🎉" badge. Loading state shows nothing to avoid layout shift.

2. **Superset visual grouping (R005):** WorkoutExerciseList groups exercises by `supersetGroupId` into a discriminated union of render items (`single` vs `superset`). Grouped exercises render inside a bordered container with a colored left border (6-color rotating palette) and a "Superset" badge. Each grouped exercise has a "Remove from superset" button that calls `clearSupersetGroup`.

3. **Superset creation UI:** Added a "Group Superset" toggle button that enters selection mode. In selection mode, ungrouped exercises show checkboxes. When 2+ exercises are checked, a sticky floating "Create Superset" button appears. Clicking it generates a `crypto.randomUUID()` groupId and calls `setSupersetGroup` on the selected exercises. Selection clears and mode exits after creation.

4. **Type interface updates:** Extended `ExerciseItemData.workoutExercise` with optional `supersetGroupId`. Exported `ExerciseItemData` and `SetData` types from WorkoutExerciseItem. WorkoutExerciseList now imports the shared type instead of defining its own duplicate.

## Verification

- `pnpm turbo typecheck` — ✅ all 3 packages compile (backend, web-app, native-app)
- `npx tsx packages/backend/scripts/verify-s03.ts` — ✅ 12/12 checks pass (R003, R005, R007)
- `npx tsx packages/backend/scripts/verify-s02.ts` — ✅ 15/15 checks pass (no regression)
- Browser verification blocked by Clerk dev mode CAPTCHA — typecheck + verification scripts confirm all API bindings and backend contracts

## Diagnostics

- `useQuery(api.sets.getPreviousPerformance)` calls visible in Convex dashboard function logs
- `setSupersetGroup`/`clearSupersetGroup` mutations in Convex function history
- `workoutExercises` table in Convex dashboard shows `supersetGroupId` values
- Run `npx tsx packages/backend/scripts/verify-s03.ts` for full contract check
- Component source shows query hooks and mutation calls for inspection

## Deviations

- Browser UI verification could not be completed due to Clerk dev mode Cloudflare CAPTCHA blocking automated sign-up/sign-in. This is an expected limitation documented in the slice plan's proof level ("browser auth limited by Clerk dev captcha"). Full API contract verification via scripts and typecheck compensates.
- Removed duplicate `SetData`/`ExerciseItemData` interfaces from WorkoutExerciseList — now imports from WorkoutExerciseItem for DRY.

## Known Issues

- Single-member superset groups: If removing exercises leaves only 1 exercise in a superset, that exercise remains visually in a superset container. Users can clear it manually via the "Remove from superset" button. This is acceptable per the task plan's note.
- Browser-based visual verification requires a real Clerk sign-in — not automatable without test account bypass.

## Files Created/Modified

- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Added useQuery for getPreviousPerformance, formatPreviousPerformance helper, inline previous performance display, "First time!" badge, selection checkbox props, exported ExerciseItemData/SetData types
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — Added superset visual grouping (discriminated union render items), selection mode with checkbox state, "Group Superset" toggle, floating "Create Superset" button, "Remove from Superset" per-exercise button, imported shared ExerciseItemData type
