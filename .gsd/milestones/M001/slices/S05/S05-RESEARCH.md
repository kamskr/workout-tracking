# S05: Workout Templates — Research

**Date:** 2026-03-11

## Summary

S05 delivers R006 (Workout Templates) — saving completed workouts as reusable templates, listing/editing/deleting templates, and starting new workouts pre-filled from a template. The schema already exists (`workoutTemplates` and `templateExercises` tables) and the Convex backend patterns from S01-S04 are mature and consistent. This is a low-risk slice with no new technologies — it's pure CRUD on existing schema using established patterns.

The main design question is what data to copy into a template vs. what to leave for fresh input. Per R006, templates store exercise selection and set structure (target sets/reps) but leave weight/RPE blank. The `templateExercises` schema already has `targetSets`, `targetReps`, `targetWeight`, `restSeconds`, and `order` — this is well-suited. The one gap is that the schema doesn't store `supersetGroupId` on template exercises, which means superset groupings from S03 won't carry over into templates. This is a minor gap — can be added as an optional field on `templateExercises` if desired, or deferred.

The UI surface is three flows: (1) "Save as Template" button on completed workout cards/detail view, (2) `/templates` page listing saved templates, and (3) "Start from Template" flow that creates a new workout pre-filled with template exercises. All integrate with existing components (WorkoutHistory, ActiveWorkout) and follow the same Tailwind + component patterns.

## Recommendation

Build S05 in 3 tasks:

1. **Backend (Convex functions + test helpers):** Create `convex/templates.ts` with `saveAsTemplate`, `listTemplates`, `getTemplateWithExercises`, `deleteTemplate`, `startWorkoutFromTemplate` mutations/queries. Add corresponding test helpers to `testing.ts`. Build `verify-s05.ts` script.

2. **Templates list page:** Create `/templates` route with template cards showing name, exercise count, creation date. Include delete functionality and a "Start Workout" action per template.

3. **Save-as-template flow + load-from-template integration:** Add "Save as Template" button to completed workout cards in WorkoutHistory. Wire the "Start Workout" button on template cards to create a new workout pre-filled with template exercises. Navigate to `/workouts/active` after loading.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Auth-gated Convex mutations | `getUserId` from `convex/lib/auth.ts` | All S01-S04 functions use this pattern. Consistency. |
| Ownership verification | `verifyWorkoutOwnershipAndStatus` helper pattern | S02 established this. Template mutations need same ownership check. |
| Test helpers bypassing auth | `testing.ts` public mutations with `testUserId` param | D017 pattern. Add template test helpers here. |
| Verification scripting | `verify-s02.ts` / `verify-s03.ts` / `verify-s04.ts` pattern | Same ConvexHttpClient + check() runner. |
| UI components | `Button`, `cn()`, existing card/list patterns | WorkoutCard and WorkoutHistory patterns transfer directly. |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — `workoutTemplates` table (userId, name, description, createdFromWorkoutId) with `by_userId` index. `templateExercises` table (templateId, exerciseId, order, targetSets, targetReps, targetWeight, restSeconds) with `by_templateId` index. **Schema is ready — no migration needed.**
- `packages/backend/convex/workouts.ts` — `getWorkoutWithDetails` returns `{ workout, exercises: [{ workoutExercise, exercise, sets }] }`. This is the data source for `saveAsTemplate` — read the completed workout and copy exercise/set structure into template tables.
- `packages/backend/convex/workoutExercises.ts` — `addExerciseToWorkout` pattern (auto-compute order from existing count). `saveAsTemplate` should follow the same auto-ordering for template exercises.
- `packages/backend/convex/sets.ts` — `logSet` auto-computes `setNumber` from count. The "start from template" flow will use `logSet` or direct insert to pre-create empty sets.
- `apps/web/src/components/workouts/WorkoutCard.tsx` — Card pattern with date, badges, delete button. Template cards follow same visual pattern.
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — List page pattern with loading/empty/populated states. `/templates` page follows same structure.
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — Auto-create-or-resume pattern. "Start from template" needs to create a workout with pre-filled exercises, then navigate to this page. The page will pick up the new in-progress workout via `getActiveWorkout`.
- `packages/backend/convex/testing.ts` — Established test helper pattern with 15+ functions. Add `testSaveAsTemplate`, `testListTemplates`, `testDeleteTemplate`, `testStartFromTemplate`, `testGetTemplateWithExercises`.
- `apps/web/src/middleware.ts` — Protected routes matcher includes `/workouts(.*)`. Need to add `/templates(.*)` to the matcher.

## Constraints

- **Schema is already deployed.** The `workoutTemplates` and `templateExercises` tables are in `schema.ts`. No schema changes needed unless we add superset grouping to templates.
- **Templates only from completed workouts.** R006 says "save any completed workout as a reusable template." The `saveAsTemplate` mutation should verify the workout status is `completed`.
- **Template exercises store structure, not performance.** Per R006: "templates store exercise selection and set structure, not performance data." The `targetSets`/`targetReps` fields capture structure; `weight` field exists on `templateExercises` but `targetWeight` is optional — leave it blank unless the user explicitly sets it.
- **Convex transaction limits.** A workout with 10 exercises × 4 sets = 40 set reads + 10 exercise reads + 10 template exercise inserts. Well within Convex's limits (256 documents per transaction).
- **No separate template edit page needed for S05.** R006 says "editable and deletable" but the roadmap scope says "save, view, start from." Editing template details (name, exercises) can be a follow-up. Delete is in scope.
- **Middleware must protect `/templates` route.** Add it to the Clerk middleware matcher.
- **`createWorkout` creates with `inProgress` status.** The `startWorkoutFromTemplate` flow should: (1) create workout, (2) add exercises from template in order, (3) optionally pre-create empty set rows. Then the user navigates to `/workouts/active` which auto-detects the in-progress workout.

## Common Pitfalls

- **Race condition with existing active workout.** If the user already has an in-progress workout and clicks "Start from Template", we need to handle the conflict. Options: (a) block and show message, (b) auto-finish the existing one, (c) ask the user. Safest is (a) — check for active workout before creating from template. The `ActiveWorkout` component already handles this via `getActiveWorkout`.
- **Stale exercise references.** Template exercises store `exerciseId` references. If a custom exercise is deleted, the reference becomes stale. The `getTemplateWithExercises` query should handle `null` exercise lookups gracefully (same as `getWorkoutWithDetails` does).
- **Double-submit on save-as-template.** User might click "Save as Template" twice quickly. Use a loading state and disable the button after the first click, same pattern as delete confirmation in `WorkoutCard`.
- **Empty workout templates.** If a completed workout has 0 exercises (possible edge case), `saveAsTemplate` should either reject or create an empty template. Rejecting with a descriptive error is better — an empty template has no value.
- **Set structure ambiguity.** When saving a template, how many "target sets" per exercise? Two approaches: (a) count the actual sets logged for each exercise in the source workout, (b) store each set as a row with target reps/weight. The schema uses `targetSets` (a count) and `targetReps` (a single number) per exercise — this is approach (a). So `targetSets = sets.length` and `targetReps = most common rep count from actual sets` (or the last set's reps). Keep it simple: `targetSets = actual set count`, `targetReps = first set's reps` (or undefined).

## Open Risks

- **Superset grouping not preserved in templates.** The `templateExercises` table lacks a `supersetGroupId` field. If the user saves a workout with supersets as a template, the grouping information is lost. This is a minor gap — can add the field to the schema or document as a known limitation for S05.
- **Navigation after "Start from Template".** The `ActiveWorkout` component auto-creates a workout on mount if none exists. If we create the workout in `startWorkoutFromTemplate` and then navigate to `/workouts/active`, there could be a brief race where `ActiveWorkout` tries to create a second one. The `createAttempted` ref guard (D022) should prevent this, but needs testing. Alternative: navigate with the new workoutId as a query param and skip auto-create.
- **Template name defaulting.** When saving, the template name could default to the workout name. If the workout name is just "Workout" (the default), templates will all have the same name. Should prompt for a name or auto-generate from the exercises (e.g., "Chest & Back" from primary muscle groups).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (121 installs), `get-convex/agent-skills@function-creator` (110 installs), `get-convex/agent-skills@schema-builder` (105 installs) | available (not installed) |
| Next.js | N/A — standard App Router patterns, no novel usage | none needed |
| Tailwind CSS | N/A — CSS-first config already working from S01 | none needed |

The Convex skills could help but the patterns are already well-established in S01-S04 (7 Convex function files, 4 verification scripts, mature test helpers). The incremental value is low for S05 given this is straightforward CRUD on existing schema.

## Sources

- Schema tables `workoutTemplates` and `templateExercises` already defined in `packages/backend/convex/schema.ts` (source: codebase)
- Boundary map S05 section specifies: `saveAsTemplate(workoutId)`, `listTemplates(userId)`, `loadTemplate(templateId)`, `deleteTemplate(id)` (source: M001-ROADMAP.md)
- R006 requirement: "templates store exercise selection and set structure, not performance data" (source: REQUIREMENTS.md)
- D017 pattern for test helpers with `testUserId` bypass (source: DECISIONS.md)
- ActiveWorkout auto-create guard via `createAttempted` ref (D022) (source: ActiveWorkout.tsx)
