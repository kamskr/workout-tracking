---
id: T01
parent: S05
milestone: M001
provides:
  - 5 auth-gated Convex template functions (saveAsTemplate, listTemplates, getTemplateWithExercises, deleteTemplate, startWorkoutFromTemplate)
  - 5 test helpers mirroring template functions with testUserId bypass
  - verify-s05.ts integration script with 8 R006 checks
key_files:
  - packages/backend/convex/templates.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s05.ts
key_decisions: []
patterns_established:
  - Template save copies exercise structure (order, set count as targetSets, first set's reps as targetReps, restSeconds) from workout into templateExercises
  - startWorkoutFromTemplate creates workout + exercises but NO sets (user logs fresh)
  - Cascade delete pattern for templates mirrors workout cascade delete
observability_surfaces:
  - "npx tsx packages/backend/scripts/verify-s05.ts — 8 named checks with PASS/FAIL and exit 0/1"
  - "Descriptive errors: Workout not found, Workout is not completed, Workout has no exercises, Template not found, Cannot start from template: you already have an active workout"
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Convex template functions + test helpers + verification script

**Built complete backend for workout templates: 5 Convex functions, 5 test helpers, and 8-check verification script — all passing.**

## What Happened

Created `packages/backend/convex/templates.ts` with 5 functions:
- `saveAsTemplate` — validates workout is completed and has exercises, copies exercise structure (order, targetSets from actual set count, targetReps from first set's reps, restSeconds) into `workoutTemplates` + `templateExercises` tables.
- `listTemplates` — returns user's templates via `by_userId` index, ordered desc.
- `getTemplateWithExercises` — joins template with templateExercises and exercise details; handles null exercise gracefully (stale reference).
- `deleteTemplate` — cascade-deletes all templateExercises then the template.
- `startWorkoutFromTemplate` — checks no active workout exists, verifies ownership, creates inProgress workout with template name, adds exercises from template in order with restSeconds. Does NOT pre-create sets.

Extended `packages/backend/convex/testing.ts` with 5 matching test helpers (`testSaveAsTemplate`, `testListTemplates`, `testGetTemplateWithExercises`, `testDeleteTemplate`, `testStartFromTemplate`). Updated `testCleanup` to cascade-delete `workoutTemplates` and `templateExercises` before workouts.

Created `packages/backend/scripts/verify-s05.ts` with 8 named checks covering save, list, get, start, reject-non-completed, reject-empty, reject-active-conflict, and delete.

## Verification

- `pnpm turbo typecheck --force` — ✅ 3/3 packages compile cleanly
- `npx tsx packages/backend/scripts/verify-s05.ts` — ✅ 8/8 checks pass:
  - R006-1: Save as template returns a template ID
  - R006-2: List templates includes saved template
  - R006-3: Template has 2 exercises with correct targetSets (3, 2) and targetReps (10, 12)
  - R006-4: Start from template creates workout with 2 exercises, correct order, no sets
  - R006-5: Reject save from non-completed workout
  - R006-6: Reject save from empty workout (0 exercises)
  - R006-7: Reject start from template when active workout exists
  - R006-8: Delete template removes template and list is empty

### Slice-level verification status (intermediate — T02 remaining):
- `npx tsx packages/backend/scripts/verify-s05.ts` — ✅ pass
- `pnpm turbo typecheck --force` — ✅ pass
- `/templates` route protected by Clerk middleware — ⏳ T02

## Diagnostics

- Run `npx tsx packages/backend/scripts/verify-s05.ts` — 8 checks with structured PASS/FAIL output, exit 0 on all pass, exit 1 on any failure with expected vs actual details.
- Convex dashboard: inspect `workoutTemplates` and `templateExercises` tables.
- All mutations throw descriptive errors: "Workout not found", "Workout is not completed", "Workout has no exercises — cannot save as template", "Template not found", "Template does not belong to user", "Cannot start from template: you already have an active workout".

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/templates.ts` — new: 5 auth-gated Convex functions for template CRUD
- `packages/backend/convex/testing.ts` — extended: 5 template test helpers + testCleanup updated to clean template data
- `packages/backend/scripts/verify-s05.ts` — new: 8-check integration verification script for R006
