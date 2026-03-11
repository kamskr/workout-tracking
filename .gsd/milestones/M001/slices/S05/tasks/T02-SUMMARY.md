---
id: T02
parent: S05
milestone: M001
provides:
  - /templates page with template cards (list, delete, start workout)
  - SaveAsTemplateButton on completed workout cards
  - Navigation wiring between workout history and templates
key_files:
  - apps/web/src/components/templates/SaveAsTemplateButton.tsx
  - apps/web/src/components/templates/TemplateCard.tsx
  - apps/web/src/components/templates/TemplateList.tsx
  - apps/web/src/app/templates/page.tsx
  - apps/web/src/middleware.ts
  - apps/web/src/components/workouts/WorkoutCard.tsx
  - apps/web/src/components/workouts/WorkoutHistory.tsx
key_decisions:
  - Used window.prompt for template naming and window.alert/confirm for error/delete confirmation to stay consistent with existing patterns in WorkoutCard
patterns_established:
  - Template UI components follow same card/list/page structure as workouts (WorkoutCard → TemplateCard, WorkoutHistory → TemplateList)
  - Mutation error messages from Convex surfaced directly to users via window.alert
  - Loading/empty/populated three-state pattern reused from WorkoutHistory
observability_surfaces:
  - Convex mutation errors surface via window.alert (save template, start workout, delete template)
  - Button disabled states prevent double-submit during async operations
  - Loading spinners indicate pending queries
duration: ~15min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Templates list page + Save-as-Template flow + Start-from-Template flow

**Built complete web UI for workout templates: /templates page with template cards, Save-as-Template button on completed workouts, Start Workout from template with navigation, and cross-linking between workouts and templates pages.**

## What Happened

Implemented all 7 steps from the task plan:

1. Added `/templates(.*)` to middleware protected routes so unauthenticated users are redirected.
2. Created `SaveAsTemplateButton` — prompts for template name via `window.prompt()`, calls `saveAsTemplate` mutation, shows loading spinner, surfaces errors via `window.alert()`.
3. Wired `SaveAsTemplateButton` into `WorkoutCard` — renders only when `workout.status === "completed"`, placed alongside the delete button.
4. Created `TemplateCard` — shows template name, creation date, exercise count, exercise names (truncated to 4 with "+N more"), with "Start Workout" button (calls `startWorkoutFromTemplate`, navigates to `/workouts/active`) and delete button (with `window.confirm()`).
5. Created `TemplateList` — loading spinner, empty state ("Save a workout as a template to get started"), or grid of TemplateCards.
6. Created `/templates` page — heading, subtitle, "View History" link back to `/workouts`, renders TemplateList.
7. Added "Templates" link button in `WorkoutHistory` header alongside "Start Workout".

## Verification

- `pnpm turbo typecheck --force` — all 3 packages (backend, web, native) compile cleanly with 0 errors
- `/templates(.*)` confirmed in middleware protected routes array via grep
- All 8 must-haves verified:
  - `/templates` route protected by Clerk middleware ✓
  - `SaveAsTemplateButton` appears only on completed workout cards ✓
  - `SaveAsTemplateButton` prompts for name and calls `saveAsTemplate` mutation ✓
  - `TemplateCard` "Start Workout" calls `startWorkoutFromTemplate` and navigates to `/workouts/active` ✓
  - `TemplateCard` "Start Workout" handles active-workout conflict error with user-facing message ✓
  - `TemplateCard` delete has confirmation dialog and calls `deleteTemplate` ✓
  - `TemplateList` shows loading/empty/populated states ✓
  - No `as any` casts on template functions ✓

## Diagnostics

- `pnpm turbo typecheck --force` verifies all API bindings resolve to real `api.templates.*` functions
- Browser inspection of `/templates` route shows template list
- Middleware file `apps/web/src/middleware.ts` shows protected routes
- Convex mutation errors are surfaced directly to users via `window.alert()` — visible in browser dialog logs

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/middleware.ts` — added `/templates(.*)` to protected routes
- `apps/web/src/components/templates/SaveAsTemplateButton.tsx` — new: button to save completed workout as template
- `apps/web/src/components/templates/TemplateCard.tsx` — new: card with template details, start workout, and delete actions
- `apps/web/src/components/templates/TemplateList.tsx` — new: list component with loading/empty/populated states
- `apps/web/src/app/templates/page.tsx` — new: route page for /templates
- `apps/web/src/components/workouts/WorkoutCard.tsx` — added SaveAsTemplateButton for completed workouts
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — added Templates link button in header
