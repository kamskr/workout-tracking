---
estimated_steps: 5
estimated_files: 3
---

# T01: Convex template functions + test helpers + verification script

**Slice:** S05 — Workout Templates
**Milestone:** M001

## Description

Create the complete backend for workout templates: 5 auth-gated Convex functions in `convex/templates.ts`, 5 test helpers in `convex/testing.ts`, and a verification script `verify-s05.ts` that proves all R006 contracts at integration level. This task establishes the data layer that T02's UI will consume.

## Steps

1. **Create `packages/backend/convex/templates.ts`** with 5 functions:
   - `saveAsTemplate(workoutId, name, description?)` — mutation. Auth-gated via `getUserId`. Verifies: workout exists, belongs to user, status is `completed`, has at least 1 exercise. Reads workout exercises and their sets. For each exercise: inserts a `templateExercises` row with `exerciseId`, `order`, `targetSets` (count of actual sets), `targetReps` (first set's reps or undefined), `restSeconds` (from workoutExercise). Creates a `workoutTemplates` row with `userId`, `name`, `description`, `createdFromWorkoutId`. Returns the template ID.
   - `listTemplates()` — query. Auth-gated. Returns all templates for current user via `by_userId` index, ordered desc (newest first).
   - `getTemplateWithExercises(templateId)` — query. Auth-gated. Verifies ownership. Joins template with its `templateExercises` (via `by_templateId` index) and their exercise details from the `exercises` table. Returns `{ template, exercises: [{ templateExercise, exercise }] }`. Handles null exercise gracefully (stale reference).
   - `deleteTemplate(templateId)` — mutation. Auth-gated. Verifies ownership. Cascade-deletes all `templateExercises` for this template, then deletes the template itself.
   - `startWorkoutFromTemplate(templateId)` — mutation. Auth-gated. Checks no active workout exists (query `by_userId_status` for `inProgress`). Verifies template ownership. Creates an `inProgress` workout with template name. For each template exercise (ordered by `order`): calls `ctx.db.insert("workoutExercises", ...)` with `exerciseId`, `order`, and `restSeconds` from the template exercise. Does NOT pre-create sets — user logs fresh. Returns the new workout ID.

2. **Extend `packages/backend/convex/testing.ts`** with 5 test helpers:
   - `testSaveAsTemplate(testUserId, workoutId, name, description?)` — mirrors saveAsTemplate logic with explicit testUserId
   - `testListTemplates(testUserId)` — query returning templates for testUserId
   - `testGetTemplateWithExercises(testUserId, templateId)` — query returning template + exercises
   - `testDeleteTemplate(testUserId, templateId)` — mutation with cascade delete
   - `testStartFromTemplate(testUserId, templateId)` — mutation creating workout from template
   - Update `testCleanup` to also delete `workoutTemplates` and `templateExercises` for the test user

3. **Create `packages/backend/scripts/verify-s05.ts`** following the verify-s04.ts pattern:
   - Setup: cleanup, create workout, add 2 exercises, log 3 sets on first exercise (60kg×10, 65kg×8, 70kg×6), log 2 sets on second exercise (20kg×12, 22kg×10), finish workout
   - R006-1: Save as template — verify template created with correct name
   - R006-2: List templates — verify template appears in list
   - R006-3: Get template with exercises — verify 2 exercises with correct targetSets (3 and 2) and targetReps (10 and 12)
   - R006-4: Start workout from template — verify new inProgress workout created with 2 exercises in correct order, no sets pre-created
   - R006-5: Reject save from non-completed workout — create inProgress workout, attempt save, expect error
   - R006-6: Reject save from empty workout — create + finish workout with 0 exercises, attempt save, expect error
   - R006-7: Reject start when active workout exists — with the T4 workout still active, attempt start from template again, expect error
   - R006-8: Delete template — delete, verify list is empty
   - Cleanup at end

4. **Run typecheck** to ensure all new Convex functions compile and deploy correctly.

5. **Run `verify-s05.ts`** against live local Convex backend. All checks must pass.

## Must-Haves

- [ ] `saveAsTemplate` verifies completed status and non-empty exercises before creating template
- [ ] `saveAsTemplate` computes `targetSets` from actual set count and `targetReps` from first set's reps
- [ ] `startWorkoutFromTemplate` rejects when an active workout already exists
- [ ] `startWorkoutFromTemplate` does NOT pre-create sets (user logs fresh per R006)
- [ ] `deleteTemplate` cascade-deletes all associated `templateExercises`
- [ ] `testCleanup` also removes template data for test user
- [ ] `verify-s05.ts` has 8+ named checks covering save, list, get, start, reject-non-completed, reject-empty, reject-active-conflict, delete

## Verification

- `pnpm turbo typecheck --force` — all 3 packages compile cleanly
- `npx tsx packages/backend/scripts/verify-s05.ts` — all checks pass (exit 0)

## Observability Impact

- Signals added/changed: All 5 template mutations/queries throw descriptive errors: "Workout not found", "Workout does not belong to user", "Workout is not completed", "Workout has no exercises — cannot save as template", "Template not found", "Template does not belong to user", "Cannot start from template: you already have an active workout"
- How a future agent inspects this: `npx tsx packages/backend/scripts/verify-s05.ts` — 8+ named checks with PASS/FAIL. Convex dashboard: `workoutTemplates` and `templateExercises` tables. CLI: `npx convex run templates:listTemplates`.
- Failure state exposed: Each check in verify-s05.ts prints the expected vs actual value on failure. Script exits with code 1 on any failure.

## Inputs

- `packages/backend/convex/schema.ts` — `workoutTemplates` and `templateExercises` table definitions (already deployed)
- `packages/backend/convex/workouts.ts` — `getWorkoutWithDetails` pattern for compound queries
- `packages/backend/convex/testing.ts` — existing test helper pattern with testUserId bypass
- `packages/backend/scripts/verify-s04.ts` — verification script structure (ConvexHttpClient + check runner)
- `packages/backend/convex/lib/auth.ts` — `getUserId` for auth gating

## Expected Output

- `packages/backend/convex/templates.ts` — 5 Convex functions (saveAsTemplate, listTemplates, getTemplateWithExercises, deleteTemplate, startWorkoutFromTemplate)
- `packages/backend/convex/testing.ts` — extended with 5 template test helpers + updated testCleanup
- `packages/backend/scripts/verify-s05.ts` — 8+ check verification script, all passing
