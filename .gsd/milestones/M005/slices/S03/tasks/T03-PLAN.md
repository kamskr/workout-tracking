---
estimated_steps: 3
estimated_files: 1
---

# T03: Add "Start Group Session" button on workouts page

**Slice:** S03 — Integration Hardening & Verification
**Milestone:** M005

## Description

The workouts page (`/workouts`) currently has no UI entry point for creating a group session — users must navigate directly to session URLs. This task adds a "Start Group Session" button that calls `createSession` and navigates to the live session page, completing the user-facing flow from workout history to group session creation.

## Steps

1. **Add imports and hooks to workouts page** — Convert the component to use `useMutation(api.sessions.createSession)`, `useRouter()` from `next/navigation`, and `useState` for loading state. The page is already `"use client"`.

2. **Add "Start Group Session" button to page header** — Place button in the header area next to the "Workout History" heading. Style with Tailwind (blue accent per D007 design language). Add `data-start-group-session` attribute for programmatic testing (extends D057/D152 pattern). Button text: "Start Group Session" with a loading state showing "Creating..." while the mutation runs. On success, router.push to `/workouts/session/${sessionId}`. On error, console.error and optionally show inline error text.

3. **Verify web compilation** — Run `pnpm -C apps/web exec tsc --noEmit` and confirm 0 errors. Verify the `data-start-group-session` attribute is present in the JSX.

## Must-Haves

- [ ] "Start Group Session" button visible on `/workouts` page
- [ ] Button calls `createSession` mutation on click
- [ ] On success, navigates to `/workouts/session/[sessionId]`
- [ ] `data-start-group-session` attribute on the button element
- [ ] Loading state during mutation execution
- [ ] Error handling (try/catch, console.error)
- [ ] Web compiles with 0 errors

## Verification

- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `grep 'data-start-group-session' apps/web/src/app/workouts/page.tsx` — matches
- `grep 'createSession' apps/web/src/app/workouts/page.tsx` — matches (mutation usage)
- `grep 'useRouter' apps/web/src/app/workouts/page.tsx` — matches (navigation)

## Observability Impact

- Signals added/changed: None — createSession already logs `[Session] createSession` in sessions.ts
- How a future agent inspects this: `data-start-group-session` CSS selector for browser-based assertions. Console logs in browser devtools for mutation errors.
- Failure state exposed: Inline error message or console.error if createSession mutation fails (e.g., network error).

## Inputs

- `apps/web/src/app/workouts/page.tsx` — Current page with heading + WorkoutHistory, no session creation UI
- `packages/backend/convex/sessions.ts` — `createSession` mutation returns `sessionId` (Id<"groupSessions">)
- D007 (clean/minimal design), D152 (session data attributes), D057 (data-* pattern)

## Expected Output

- `apps/web/src/app/workouts/page.tsx` — Modified: added "Start Group Session" button with mutation + navigation + loading + error handling + data attribute
