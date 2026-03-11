---
estimated_steps: 7
estimated_files: 8
---

# T02: Templates list page + Save-as-Template flow + Start-from-Template flow

**Slice:** S05 — Workout Templates
**Milestone:** M001

## Description

Build the complete web UI for workout templates: a `/templates` page with template cards (list, delete, start workout), a "Save as Template" button on completed workout cards, and navigation wiring between the workout history and templates. This is the user-facing surface that makes R006 real.

## Steps

1. **Update `apps/web/src/middleware.ts`** — add `/templates(.*)` to the `isProtectedRoute` matcher so unauthenticated users are redirected to Clerk sign-in.

2. **Create `apps/web/src/components/templates/SaveAsTemplateButton.tsx`** — a button component that:
   - Accepts `workoutId` and `workoutName` props
   - On click, prompts user for a template name via `window.prompt()` with default value of the workout name
   - If user confirms, calls `api.templates.saveAsTemplate` mutation with the workoutId and entered name
   - Shows loading state (disabled button with spinner) during save
   - Handles errors gracefully (alert with error message)
   - Uses the same `Button` component and styling conventions as other action buttons

3. **Wire `SaveAsTemplateButton` into `apps/web/src/components/workouts/WorkoutCard.tsx`** — render the button only when `workout.status === "completed"`. Place it in the card's action area alongside the delete button. Import the SaveAsTemplateButton component.

4. **Create `apps/web/src/components/templates/TemplateCard.tsx`** — a card component that:
   - Accepts a template object (from `listTemplates`) as prop
   - Self-fetches template exercises via `useQuery(api.templates.getTemplateWithExercises, { templateId })`
   - Shows: template name, exercise count, exercise names (truncated list), creation date
   - "Start Workout" button: calls `api.templates.startWorkoutFromTemplate`, on success navigates to `/workouts/active` via `useRouter().push()`. On error (active workout conflict), shows an alert with the error message.
   - Delete button with `window.confirm()` confirmation, calls `api.templates.deleteTemplate`
   - Loading state while exercises are being fetched
   - Same card styling as `WorkoutCard` (rounded-xl border, shadow-sm, hover effects)

5. **Create `apps/web/src/components/templates/TemplateList.tsx`** — a list component that:
   - Calls `useQuery(api.templates.listTemplates)`
   - Renders loading state (spinner), empty state ("No templates yet. Save a workout as a template to get started."), or grid of `TemplateCard` components
   - Same layout pattern as `WorkoutHistory` (grid gap-3 sm:grid-cols-2 lg:grid-cols-3)

6. **Create `apps/web/src/app/templates/page.tsx`** — the route page that:
   - Renders page heading ("Workout Templates") with subtitle
   - Includes a link back to `/workouts`
   - Renders `TemplateList` component
   - Same page layout as the workouts page (max-w-5xl, px/py spacing)

7. **Add discoverability link** — add a "Templates" link/button in `WorkoutHistory.tsx` header (next to the "Start Workout" button) pointing to `/templates`. Add a "View History" link in the templates page pointing back to `/workouts`.

## Must-Haves

- [ ] `/templates` route is protected by Clerk middleware
- [ ] `SaveAsTemplateButton` appears only on completed workout cards
- [ ] `SaveAsTemplateButton` prompts for name and calls `saveAsTemplate` mutation
- [ ] `TemplateCard` "Start Workout" calls `startWorkoutFromTemplate` and navigates to `/workouts/active`
- [ ] `TemplateCard` "Start Workout" handles active-workout conflict error with user-facing message
- [ ] `TemplateCard` delete has confirmation dialog and calls `deleteTemplate`
- [ ] `TemplateList` shows loading/empty/populated states
- [ ] All Convex API bindings are type-safe (no `as any` casts on template functions)

## Verification

- `pnpm turbo typecheck --force` — all 3 packages compile cleanly with no type errors
- All template API imports resolve to real `api.templates.*` functions from T01
- `/templates` is in the middleware protected routes array

## Observability Impact

- Signals added/changed: UI error handling surfaces mutation error messages via `window.alert()` for save and start-from-template failures. Loading states for async operations prevent user confusion.
- How a future agent inspects this: `pnpm turbo typecheck --force` verifies all API bindings. Browser inspection of `/templates` route. Middleware file shows protected routes.
- Failure state exposed: Save/start/delete mutations surface Convex error messages directly to the user. Button disabled states prevent double-submit.

## Inputs

- `packages/backend/convex/templates.ts` — 5 Convex functions from T01 (saveAsTemplate, listTemplates, getTemplateWithExercises, deleteTemplate, startWorkoutFromTemplate)
- `apps/web/src/components/workouts/WorkoutCard.tsx` — existing card component to extend with SaveAsTemplateButton
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — existing list pattern to follow and extend with templates link
- `apps/web/src/components/common/button.tsx` — Button component for consistent styling
- `apps/web/src/middleware.ts` — existing protected routes to extend

## Expected Output

- `apps/web/src/middleware.ts` — modified with `/templates(.*)` in protected routes
- `apps/web/src/components/templates/SaveAsTemplateButton.tsx` — new component for saving workout as template
- `apps/web/src/components/workouts/WorkoutCard.tsx` — modified to include SaveAsTemplateButton on completed workouts
- `apps/web/src/components/templates/TemplateCard.tsx` — new component showing template with start/delete actions
- `apps/web/src/components/templates/TemplateList.tsx` — new component listing user's templates
- `apps/web/src/app/templates/page.tsx` — new route page for templates
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — modified with link to /templates
