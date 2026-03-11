# S05: Workout Templates

**Goal:** Users can save a completed workout as a reusable template, view their saved templates, delete templates, and start a new workout pre-filled from a template — all on web.
**Demo:** After completing a workout, user clicks "Save as Template", enters a name, sees it appear in `/templates`. From that page, they click "Start Workout" on a template, and navigate to `/workouts/active` with exercises pre-filled. They can also delete a template.

## Must-Haves

- `saveAsTemplate` mutation copies completed workout's exercise structure into `workoutTemplates` + `templateExercises` tables
- `listTemplates` query returns all templates for the current user
- `getTemplateWithExercises` query returns a template with its exercises joined
- `deleteTemplate` mutation cascade-deletes template and its template exercises
- `startWorkoutFromTemplate` mutation creates a new inProgress workout pre-filled with template exercises (no sets pre-created — user logs fresh)
- `startWorkoutFromTemplate` rejects if user already has an active workout
- Templates list page at `/templates` with loading/empty/populated states
- "Save as Template" button on completed workout cards in workout history
- "Start Workout" button on template cards navigates to `/workouts/active`
- Middleware protects `/templates` route
- `verify-s05.ts` script proves all backend contracts (R006)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Convex backend + web UI compilation)
- Human/UAT required: no (programmatic verification + typecheck)

## Verification

- `npx tsx packages/backend/scripts/verify-s05.ts` — all checks pass (R006: save, list, get, delete, start-from-template, reject-empty-workout, reject-active-conflict)
- `pnpm turbo typecheck --force` — all 3 packages compile cleanly
- `/templates` route protected by Clerk middleware (same pattern as `/workouts`)

## Observability / Diagnostics

- Runtime signals: All mutations throw descriptive errors ("Workout not found", "Workout is not completed", "Workout has no exercises", "Template not found", "Template does not belong to user", "Cannot start from template: you already have an active workout")
- Inspection surfaces: `npx tsx packages/backend/scripts/verify-s05.ts` — named checks with PASS/FAIL and exit 0/1. Convex dashboard tables: `workoutTemplates`, `templateExercises`.
- Failure visibility: Each mutation error includes the reason for rejection. Template queries return null/empty for missing data (no silent failures).
- Redaction constraints: none (no secrets in workout template data)

## Integration Closure

- Upstream surfaces consumed: `convex/workouts.ts` (getWorkoutWithDetails, getActiveWorkout, createWorkout), `convex/workoutExercises.ts` (addExerciseToWorkout, listExercisesForWorkout), `convex/sets.ts` (listSetsForExercise), `convex/testing.ts` (test helpers), `WorkoutCard.tsx`, `WorkoutHistory.tsx`, middleware.ts
- New wiring introduced in this slice: `convex/templates.ts` (new file — all template CRUD), `/templates` route + page, "Save as Template" button wired into WorkoutCard, "Start Workout" button wired to create workout + navigate to `/workouts/active`
- What remains before the milestone is truly usable end-to-end: S06 — mobile app implementation of all S01-S05 features, cross-platform polish, realtime sync verification

## Tasks

- [x] **T01: Convex template functions + test helpers + verification script** `est:45m`
  - Why: Backend is the foundation — all UI depends on these functions. Verification script proves R006 at integration level before any UI work begins.
  - Files: `packages/backend/convex/templates.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s05.ts`
  - Do: Create `convex/templates.ts` with 5 functions: `saveAsTemplate(workoutId, name, description?)` — verifies workout is completed and has exercises, copies exercise structure with targetSets (count of actual sets) and targetReps (first set's reps) into templateExercises. `listTemplates()` — returns user's templates sorted desc. `getTemplateWithExercises(templateId)` — joins template with exercises and exercise details. `deleteTemplate(templateId)` — cascade deletes template + templateExercises. `startWorkoutFromTemplate(templateId)` — checks no active workout exists, creates inProgress workout, adds exercises from template in order with restSeconds carried over. All functions use `getUserId` auth pattern. Add 5 test helpers to `testing.ts`: `testSaveAsTemplate`, `testListTemplates`, `testGetTemplateWithExercises`, `testDeleteTemplate`, `testStartFromTemplate`. Extend `testCleanup` to also delete workoutTemplates + templateExercises. Build `verify-s05.ts` with checks: save template from completed workout, list templates, get template with exercises, start workout from template (verify exercises match), reject save from non-completed workout, reject save from empty workout, reject start when active workout exists, delete template.
  - Verify: `npx tsx packages/backend/scripts/verify-s05.ts` exits 0 with all checks passing
  - Done when: All verification checks pass and `pnpm turbo typecheck --force` compiles cleanly

- [x] **T02: Templates list page + Save-as-Template flow + Start-from-Template flow** `est:45m`
  - Why: This is the complete UI surface for R006 — users need to save templates, browse them, start workouts from them, and delete them. Single task because the three flows are tightly coupled (save produces what the list shows, list provides the start action) and each is a small component.
  - Files: `apps/web/src/app/templates/page.tsx`, `apps/web/src/components/templates/TemplateList.tsx`, `apps/web/src/components/templates/TemplateCard.tsx`, `apps/web/src/components/templates/SaveAsTemplateButton.tsx`, `apps/web/src/components/workouts/WorkoutCard.tsx`, `apps/web/src/middleware.ts`
  - Do: (1) Add `/templates(.*)` to middleware's protected route matcher. (2) Create `/templates` route page with heading + `TemplateList` component. (3) Build `TemplateList` — calls `api.templates.listTemplates`, renders loading/empty/populated states (same pattern as WorkoutHistory). (4) Build `TemplateCard` — shows template name, exercise count (via `getTemplateWithExercises`), creation date, "Start Workout" button, delete button with confirmation. "Start Workout" calls `startWorkoutFromTemplate` then navigates to `/workouts/active` via `router.push`. Handle active-workout conflict error with an alert. (5) Build `SaveAsTemplateButton` — renders on completed WorkoutCards. Opens a prompt for template name (default: workout name), calls `saveAsTemplate`, shows success feedback. (6) Wire `SaveAsTemplateButton` into `WorkoutCard` for completed workouts. (7) Add `/templates` link to the workouts page header for discoverability.
  - Verify: `pnpm turbo typecheck --force` compiles cleanly. All Convex API bindings are type-safe (no `as any` casts on template functions).
  - Done when: Typecheck passes, `/templates` route exists and is protected, WorkoutCard shows "Save as Template" for completed workouts, TemplateCard has "Start Workout" and delete actions wired to real Convex mutations

## Files Likely Touched

- `packages/backend/convex/templates.ts` (new)
- `packages/backend/convex/testing.ts` (extend)
- `packages/backend/scripts/verify-s05.ts` (new)
- `apps/web/src/app/templates/page.tsx` (new)
- `apps/web/src/components/templates/TemplateList.tsx` (new)
- `apps/web/src/components/templates/TemplateCard.tsx` (new)
- `apps/web/src/components/templates/SaveAsTemplateButton.tsx` (new)
- `apps/web/src/components/workouts/WorkoutCard.tsx` (modify — add save-as-template button)
- `apps/web/src/middleware.ts` (modify — add /templates route)
