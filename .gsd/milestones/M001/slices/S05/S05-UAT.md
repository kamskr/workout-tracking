# S05: Workout Templates — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All backend contracts are proven by `verify-s05.ts` (8 integration checks against live Convex). Web UI is verified by TypeScript compilation ensuring all Convex API bindings resolve to real functions. No complex runtime behavior (animations, timers, async state machines) that requires browser-level verification — the UI is standard CRUD with button clicks, prompts, and navigation.

## Preconditions

- Convex backend running locally (`npx convex dev` in `packages/backend`)
- Exercise seed data loaded (`npx tsx packages/backend/scripts/seed.ts`)
- Web app running (`pnpm dev` in `apps/web`)
- User authenticated via Clerk

## Smoke Test

Navigate to `/templates` — page loads with heading "Workout Templates" and either an empty state message or a list of saved templates. Page requires authentication (unauthenticated users redirected to sign-in).

## Test Cases

### 1. Save a completed workout as a template

1. Navigate to `/workouts` to see workout history
2. Find a completed workout card (shows duration, "completed" status)
3. Click "Save as Template" button on the card
4. Enter a template name in the prompt dialog (e.g. "Push Day")
5. **Expected:** Success feedback. Template appears in `/templates` list.

### 2. View template details

1. Navigate to `/templates`
2. Observe a saved template card
3. **Expected:** Card shows template name, creation date, exercise count, and up to 4 exercise names (with "+N more" if more than 4).

### 3. Start a workout from a template

1. Navigate to `/templates`
2. Click "Start Workout" on a template card
3. **Expected:** Navigated to `/workouts/active` with a new in-progress workout. Exercises from the template are pre-filled (visible in the active workout). No sets are pre-created — user logs fresh.

### 4. Delete a template

1. Navigate to `/templates`
2. Click the delete button on a template card
3. Confirm deletion in the confirmation dialog
4. **Expected:** Template removed from the list. If it was the only template, empty state message appears.

## Edge Cases

### Save from non-completed workout

1. Attempt to call `saveAsTemplate` on an in-progress workout (via console or modified UI)
2. **Expected:** Error: "Workout is not completed"

### Start from template with active workout

1. Start a workout (have an active in-progress workout)
2. Navigate to `/templates` and click "Start Workout" on a template
3. **Expected:** Error alert: "Cannot start from template: you already have an active workout"

### Save from workout with no exercises

1. Create and immediately finish a workout without adding exercises
2. Attempt to save it as a template
3. **Expected:** Error: "Workout has no exercises — cannot save as template"

### Cancel template name prompt

1. Click "Save as Template" on a completed workout
2. Click "Cancel" on the name prompt
3. **Expected:** No template created, no error shown.

## Failure Signals

- `/templates` returns 404 or crashes — route not configured
- "Save as Template" button missing on completed workout cards — component not wired
- Template list stays in loading state forever — Convex query binding broken
- "Start Workout" navigates but no exercises appear — `startWorkoutFromTemplate` not adding exercises
- `verify-s05.ts` fails any check — backend contract broken

## Requirements Proved By This UAT

- R006 — Workout Templates: Save completed workout as template (with exercise structure), list templates, view template details, start workout from template (pre-filled exercises, no pre-created sets), delete template (cascade), reject invalid operations (non-completed, empty, active conflict). All proven by 8-check integration script + type-safe web UI compilation.

## Not Proven By This UAT

- Template editing (rename, reorder exercises) — not implemented in S05 scope
- Template features on mobile (React Native) — deferred to S06
- Superset grouping preservation in templates — intentionally omitted (D036)
- Visual design quality of template UI — no browser-level UAT performed
- Template features with many templates (pagination/performance) — not tested at scale

## Notes for Tester

- The "Save as Template" button uses `window.prompt()` for the template name — this is functional but not polished. A modal would be nicer.
- Error messages from Convex mutations are surfaced directly via `window.alert()` — check the browser dialog for error details.
- Templates don't preserve superset grouping (D036) — this is a known intentional limitation.
