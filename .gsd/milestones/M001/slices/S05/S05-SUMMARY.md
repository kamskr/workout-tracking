---
id: S05
parent: M001
milestone: M001
provides:
  - 5 auth-gated Convex template functions (saveAsTemplate, listTemplates, getTemplateWithExercises, deleteTemplate, startWorkoutFromTemplate)
  - /templates page with template cards (list, delete, start workout)
  - SaveAsTemplateButton on completed workout cards in workout history
  - 8-check verification script proving R006 at integration level
requires:
  - slice: S02
    provides: Workout CRUD (getWorkoutWithDetails, getActiveWorkout, createWorkout), workoutExercises (addExerciseToWorkout, listExercisesForWorkout), sets (listSetsForExercise), testing helpers, WorkoutCard, WorkoutHistory, middleware
affects:
  - S06
key_files:
  - packages/backend/convex/templates.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s05.ts
  - apps/web/src/app/templates/page.tsx
  - apps/web/src/components/templates/TemplateList.tsx
  - apps/web/src/components/templates/TemplateCard.tsx
  - apps/web/src/components/templates/SaveAsTemplateButton.tsx
  - apps/web/src/components/workouts/WorkoutCard.tsx
  - apps/web/src/components/workouts/WorkoutHistory.tsx
  - apps/web/src/middleware.ts
key_decisions:
  - D033: Template targetSets/targetReps derivation — set count + first set's reps
  - D034: Start-from-template creates workout without pre-created sets (user logs fresh)
  - D035: Active workout conflict on start-from-template — reject with descriptive error
  - D036: Superset grouping not preserved in templates (minor gap, deferred)
patterns_established:
  - Template save copies exercise structure (order, set count as targetSets, first set's reps as targetReps, restSeconds) from workout into templateExercises
  - startWorkoutFromTemplate creates workout + exercises but NO sets (user logs fresh)
  - Cascade delete pattern for templates mirrors workout cascade delete
  - Template UI follows same card/list/page structure as workouts (TemplateCard, TemplateList, /templates page)
  - Loading/empty/populated three-state pattern reused from WorkoutHistory
observability_surfaces:
  - "npx tsx packages/backend/scripts/verify-s05.ts — 8 named checks with PASS/FAIL and exit 0/1"
  - "Descriptive mutation errors: Workout not found, Workout is not completed, Workout has no exercises, Template not found, Template does not belong to user, Cannot start from template: you already have an active workout"
  - "Convex dashboard: workoutTemplates and templateExercises tables"
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: ~27m
verification_result: passed
completed_at: 2026-03-11
---

# S05: Workout Templates

**Users can save completed workouts as reusable templates, browse templates, start pre-filled workouts from them, and delete templates — all on web with full backend verification.**

## What Happened

Built the complete workout templates feature in two tasks:

**T01 — Backend (12m):** Created `packages/backend/convex/templates.ts` with 5 auth-gated functions: `saveAsTemplate` validates the workout is completed and has exercises, then copies exercise structure (order, targetSets from actual set count, targetReps from first set's reps, restSeconds) into `workoutTemplates` + `templateExercises` tables. `listTemplates` returns user's templates sorted desc. `getTemplateWithExercises` joins template with exercises and exercise details. `deleteTemplate` cascade-deletes template + templateExercises. `startWorkoutFromTemplate` checks no active workout exists, creates an inProgress workout with template name, and adds exercises from template in order — no sets are pre-created (user logs fresh). Added 5 test helpers to `testing.ts` and built `verify-s05.ts` with 8 checks covering save, list, get, start, reject-non-completed, reject-empty, reject-active-conflict, and delete.

**T02 — Web UI (15m):** Added `/templates(.*)` to middleware protected routes. Created `SaveAsTemplateButton` (prompts for name, calls saveAsTemplate mutation), wired into `WorkoutCard` for completed workouts. Built `TemplateCard` (shows name, exercise count, exercise names, creation date, "Start Workout" and delete buttons), `TemplateList` (loading/empty/populated states), and `/templates` page. Added "Templates" link in `WorkoutHistory` header for discoverability.

## Verification

- `pnpm turbo typecheck --force` — ✅ 3/3 packages compile cleanly (0 errors)
- `npx tsx packages/backend/scripts/verify-s05.ts` — ✅ 8/8 checks pass:
  - R006-1: Save as template returns a template ID
  - R006-2: List templates includes saved template
  - R006-3: Template has 2 exercises with correct targetSets (3, 2) and targetReps (10, 12)
  - R006-4: Start from template creates workout with 2 exercises, correct order, no sets
  - R006-5: Reject save from non-completed workout
  - R006-6: Reject save from empty workout (0 exercises)
  - R006-7: Reject start from template when active workout exists
  - R006-8: Delete template removes template and list is empty
- `/templates(.*)` in middleware protected routes — ✅ confirmed
- No `as any` casts on template functions — ✅ confirmed

## Requirements Advanced

- R006 — Workout Templates: Full backend CRUD + web UI. Save, list, get, delete, and start-from-template all working.

## Requirements Validated

- R006 — Workout Templates: 8-check integration script proves save/list/get/delete/start-from-template + 3 rejection cases. Web UI compiles with type-safe Convex API bindings. `/templates` route protected by Clerk middleware.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- Superset grouping is not preserved when saving as template (D036) — `templateExercises` lacks `supersetGroupId`. Exercise selection and order are preserved; superset membership is not.
- Template editing (rename, reorder exercises) not implemented — user must delete and re-save. Acceptable for M001 scope.
- Window.prompt/alert/confirm used for template naming and error display — functional but not polished. S06 can improve with modal components.

## Follow-ups

- S06: Implement template features on mobile (React Native)
- Consider adding template editing UI if user feedback indicates need
- Consider preserving superset grouping in templates if users rely on it

## Files Created/Modified

- `packages/backend/convex/templates.ts` — new: 5 auth-gated Convex functions for template CRUD
- `packages/backend/convex/testing.ts` — extended: 5 template test helpers + testCleanup updated
- `packages/backend/scripts/verify-s05.ts` — new: 8-check integration verification script
- `apps/web/src/app/templates/page.tsx` — new: /templates route page
- `apps/web/src/components/templates/TemplateList.tsx` — new: list with loading/empty/populated states
- `apps/web/src/components/templates/TemplateCard.tsx` — new: card with start workout and delete actions
- `apps/web/src/components/templates/SaveAsTemplateButton.tsx` — new: button for completed workout cards
- `apps/web/src/components/workouts/WorkoutCard.tsx` — modified: added SaveAsTemplateButton for completed workouts
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — modified: added Templates link button in header
- `apps/web/src/middleware.ts` — modified: added /templates to protected routes

## Forward Intelligence

### What the next slice should know
- All Convex template functions (`api.templates.*`) are ready to consume from React Native. The function signatures and error patterns match the existing workout functions (S02).
- Template UI follows the exact same card/list/page pattern as workouts — `TemplateCard` mirrors `WorkoutCard`, `TemplateList` mirrors `WorkoutHistory`. When building mobile equivalents, follow the same structure.

### What's fragile
- `SaveAsTemplateButton` uses `window.prompt()` for naming — this won't work in React Native. Mobile needs a proper text input modal.
- Error handling uses `window.alert()` — mobile needs Toast/Alert.alert replacement.

### Authoritative diagnostics
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8 named checks with structured PASS/FAIL output, exit 0/1. This is the single source of truth for R006 backend contract.
- `pnpm turbo typecheck --force` — verifies all API bindings resolve to real functions.

### What assumptions changed
- No assumptions changed. S05 was low-risk as planned and completed without surprises.
