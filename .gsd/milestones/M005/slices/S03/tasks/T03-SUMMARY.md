---
id: T03
parent: S03
milestone: M005
provides:
  - "Start Group Session" button on /workouts page with createSession mutation + navigation
key_files:
  - apps/web/src/app/workouts/page.tsx
key_decisions:
  - Button placed in header row next to "Workout History" heading (flex justify-between) for discoverability without disrupting existing content
patterns_established:
  - data-start-group-session attribute for programmatic testing (extends D057/D152 pattern)
  - Inline error display for mutation failures (red text below button, cleared on retry)
observability_surfaces:
  - console.error("[WorkoutsPage] createSession error:", err) for browser devtools debugging
  - data-start-group-session CSS selector for browser-based assertions
  - createSession mutation already logs [Session] createSession in sessions.ts (no new server-side observability needed)
duration: 6m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Add "Start Group Session" button on workouts page

**Added "Start Group Session" button to /workouts page that calls createSession mutation and navigates to the live session page on success.**

## What Happened

Modified `apps/web/src/app/workouts/page.tsx` to add a "Start Group Session" button in the page header. The button:

1. Calls `api.sessions.createSession` via `useMutation` on click
2. Shows "Creating..." loading state while the mutation runs (button disabled)
3. On success, navigates to `/workouts/session/${sessionId}` via `useRouter().push()`
4. On error, displays inline red error text below the button and logs to console
5. Has `data-start-group-session` attribute for programmatic testing
6. Styled with blue accent (bg-blue-600) per D007 design language, with hover/focus/disabled states

The page header was restructured from a simple div to a flex row with `justify-between` to accommodate the button alongside the existing heading and subtitle.

## Verification

- `pnpm -C apps/web exec tsc --noEmit` — **0 errors** ✅
- `grep 'data-start-group-session' apps/web/src/app/workouts/page.tsx` — **matches** ✅
- `grep 'createSession' apps/web/src/app/workouts/page.tsx` — **matches** (mutation import + usage + error logging) ✅
- `grep 'useRouter' apps/web/src/app/workouts/page.tsx` — **matches** (import + hook call) ✅

### Slice-Level Verification (Partial — T03 is not final task)
- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — **0 errors** ✅
- `pnpm -C apps/web exec tsc --noEmit` — **0 errors** ✅
- `pnpm -C apps/native exec tsc --noEmit` — **38 pre-existing TS2307, 0 new errors** ✅
- `verify-s03-m05.ts` compiles (exits at runtime only due to missing CONVEX_URL) ✅
- `verify-s01-m05.ts` and `verify-s02-m05.ts` still compile (regression) ✅
- `finishWorkoutCore` importable from `convex/lib/finishWorkoutCore.ts` ✅
- "Start Group Session" button has `data-start-group-session` attribute ✅
- Browser verification: page redirects to Clerk auth (expected — app requires authentication); component source confirmed correct

## Diagnostics

- **Browser devtools**: Filter console for `[WorkoutsPage] createSession error` to see mutation failures with full error objects
- **Programmatic testing**: Use `[data-start-group-session]` CSS selector for browser-based assertions
- **Server-side**: createSession mutation already logs `[Session] createSession(sessionId): created by userId, inviteCode=code` — no new server-side logging needed

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/app/workouts/page.tsx` — Added "Start Group Session" button with useMutation(createSession) + useRouter navigation + loading/error states + data-start-group-session attribute
