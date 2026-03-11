---
estimated_steps: 5
estimated_files: 3
---

# T03: Add previous performance display, superset grouping UI, and final typecheck

**Slice:** S03 — Full Set Tracking, Supersets & Previous Performance
**Milestone:** M001

## Description

Wire the `getPreviousPerformance` query into WorkoutExerciseItem to show inline previous performance (R007), and add superset grouping UI to WorkoutExerciseList with "Create Superset" and "Remove from Superset" controls (R005). This task completes all user-facing S03 features and runs final verification.

## Steps

1. **Add previous performance display to WorkoutExerciseItem** — Import `useQuery` and `api.sets.getPreviousPerformance`. Call with the exercise's `exerciseId`. When data is returned, display below the exercise name/muscle-group line: "Last: 3×10 @ 60kg, 3×8 @ 65kg" (summarize sets, using `displayWeight` from `units.ts` for unit-awareness — need to pass `unit` prop or get it from context). When null (first time), show nothing or a subtle "First time!" badge. Handle loading state (show nothing while loading to avoid layout shift).

2. **Add superset visual grouping to WorkoutExerciseList** — Before rendering, group exercises by `supersetGroupId`. Exercises sharing a non-null `supersetGroupId` render inside a bordered container with a colored left border and a "Superset" badge. Ungrouped exercises render normally. The grouping is purely visual — exercise order within a group follows their `order` field.

3. **Add exercise selection + "Create Superset" button** — Add checkbox state to WorkoutExerciseList (local state: `Set<Id<"workoutExercises">>`). Each WorkoutExerciseItem gets an optional checkbox. When 2+ exercises are checked, show a floating "Create Superset" button. On click, generate a `crypto.randomUUID()` groupId and call `setSupersetGroup` mutation with the selected IDs. Clear selection after. Only allow grouping exercises that aren't already in a superset (or show a warning).

4. **Add "Remove from Superset" button per grouped exercise** — In the superset group container, add a small "×" or "Remove" button per exercise that calls `clearSupersetGroup` mutation. If removing leaves only 1 exercise in the group, also clear that exercise's groupId (handle in UI by checking group size after mutation, or accept 1-member groups as edge case and let user clear manually).

5. **Run final verification** — `pnpm turbo typecheck` passes for all 3 packages. `npx tsx packages/backend/scripts/verify-s03.ts` still passes. `npx tsx packages/backend/scripts/verify-s02.ts` still passes (no regression). Confirm no new TypeScript errors.

## Must-Haves

- [ ] Previous performance displays inline in WorkoutExerciseItem header (unit-aware)
- [ ] Previous performance handles null case (first-time exercise) gracefully
- [ ] Exercises with same `supersetGroupId` render in a visual group container
- [ ] "Create Superset" button appears when 2+ ungrouped exercises are selected
- [ ] "Remove from Superset" button per exercise in a superset group
- [ ] `pnpm turbo typecheck` passes
- [ ] `verify-s03.ts` passes (no regression from UI changes)

## Verification

- `pnpm turbo typecheck` — all 3 packages compile
- `npx tsx packages/backend/scripts/verify-s03.ts` — all checks pass (no regression)
- `npx tsx packages/backend/scripts/verify-s02.ts` — all checks pass (no regression)
- Visual: WorkoutExerciseItem shows "Last: ..." text when exercise has previous data
- Visual: Superset group renders with bordered container and badge
- Functional: Create superset → exercises visually group. Remove from superset → exercise ungrouped.

## Observability Impact

- Signals added/changed: `useQuery(getPreviousPerformance)` subscriptions create reactive queries — visible in Convex dashboard function logs. Superset mutations (`setSupersetGroup`, `clearSupersetGroup`) log in Convex function history.
- How a future agent inspects this: Check `workoutExercises` table in Convex dashboard for `supersetGroupId` values. Run `verify-s03.ts` for full contract check. Component source shows query hooks and mutation calls.
- Failure state exposed: `getPreviousPerformance` returns null vs data — visible in component render. Superset mutations throw ownership errors if misused.

## Inputs

- `packages/backend/convex/sets.ts` — T01's `getPreviousPerformance` query
- `packages/backend/convex/workoutExercises.ts` — T01's `setSupersetGroup` / `clearSupersetGroup` mutations
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — T02's updated component with expanded SetData
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — T02's updated component with expanded SetData
- `apps/web/src/lib/units.ts` — `displayWeight`, `formatWeight` for previous performance formatting

## Expected Output

- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — previous performance display added, optional selection checkbox
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — superset visual grouping, exercise selection state, create/remove superset controls
- All verification scripts passing, all packages typechecking
