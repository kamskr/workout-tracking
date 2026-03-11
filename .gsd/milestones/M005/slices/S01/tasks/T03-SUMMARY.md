---
id: T03
parent: S01
milestone: M005
provides:
  - Live session page at /workouts/session/[id] with participant list, set feed, heartbeat
  - Join page at /session/join/[inviteCode] with auth-gated join flow and redirect
  - SessionParticipantList component with presence dots (green/yellow/gray)
  - SessionSetFeed component with exercise-grouped chronological feed
  - Middleware protection for /session(.*)
key_files:
  - apps/web/src/middleware.ts
  - apps/web/src/app/workouts/session/[id]/page.tsx
  - apps/web/src/app/session/join/[inviteCode]/page.tsx
  - apps/web/src/components/session/SessionParticipantList.tsx
  - apps/web/src/components/session/SessionSetFeed.tsx
key_decisions:
  - Heartbeat uses useRef for interval ID + useCallback for heartbeat function to avoid stale closures; stops on mutation failure (session ended/left)
  - SessionSetFeed groups sets by exercise across all participants, sorted by completedAt within each group
  - Join page uses useRef guard (D022 pattern) to prevent React strict mode double-join
patterns_established:
  - Session component architecture: page owns getSession query, child components own getSessionParticipants and getSessionSets queries independently
  - Heartbeat interval pattern: useEffect + setInterval(10s) + useRef(intervalRef) + cleanup on unmount + stop on mutation error
  - Presence dot rendering: green=active, yellow=idle, gray=left via derivedStatus from backend
  - Participant badge coloring: deterministic hash of userId maps to 8 Tailwind color combos
observability_surfaces:
  - data-session-page attribute on session page container
  - data-session-participants attribute on participant list container
  - data-presence-indicator attribute on each participant's presence dot
  - data-session-sets attribute on set feed container
  - data-session-invite attribute on join page container
  - Console logs: "[Session] Heartbeat started", "[Session] Heartbeat stopped: unmount/mutation failed", "[Session] Join success/failed"
duration: 25m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Web UI — session page, join page, middleware, and heartbeat

**Built complete web frontend for group sessions: live session page with participant list + set feed + heartbeat, join page with auth-gated flow, and middleware protection for /session routes.**

## What Happened

Implemented all 5 steps from the task plan:

1. **Middleware** — Added `/session(.*)` to the protected route matcher in middleware.ts. This ensures `/session/join/[inviteCode]` requires authentication (the session view at `/workouts/session/[id]` was already covered by `/workouts(.*)`).

2. **SessionParticipantList** — Component takes `sessionId` prop, calls `getSessionParticipants`, renders each participant with Avatar + display name + presence dot. Presence dots use green (active), yellow (idle), gray (left) with `data-presence-indicator` attribute. Shows loading skeleton and participant count header.

3. **SessionSetFeed** — Component takes `sessionId` prop, calls `getSessionSets` + `getPreferences` for weight unit. Flattens all participants' exercises and sets into a chronological feed grouped by exercise. Each entry shows a colored participant name badge (deterministic from userId hash), exercise name, weight × reps (with RPE if present), and set number. Handles optional weight/reps from schema. Shows empty state with instructive message.

4. **Join page** — `/session/join/[inviteCode]/page.tsx` fetches session via `getSessionByInviteCode`, displays host name, participant count, and status. "Join Session" button calls `joinSession` mutation with `useRef` guard (D022 pattern) against double-join. On success, redirects to `/workouts/session/[sessionId]`. Shows loading, error, not-found, and not-joinable states.

5. **Session page** — `/workouts/session/[id]/page.tsx` with three-query architecture: `getSession` in page (with "skip" pattern D085), `getSessionParticipants` in child component, `getSessionSets` in child component. Header shows session status badge + invite code + copy link button. Grid layout: sidebar for participants, main area for set feed. Heartbeat fires every 10s via `useEffect` + `setInterval`, using `useRef` for interval ID and `useCallback` for the heartbeat function. Stops on unmount or mutation failure. Includes "Create New Session" button for not-found state.

## Verification

- **`pnpm -C apps/web exec tsc --noEmit`** — 0 errors (clsx TS2307 resolved by installing the missing dependency)
- **Middleware protection** — Browser navigated to `http://localhost:3000/session/join/TESTAB` → redirected to Clerk sign-in at `accounts.dev/sign-in?redirect_url=...session%2Fjoin%2FTESTAB`. Explicit browser assertion passed (3/3 checks: url_contains accounts.dev/sign-in, redirect_url, session%2Fjoin%2FTESTAB).
- **Session page protection** — Browser navigated to `http://localhost:3000/workouts/session/test-session-id` → also redirected to Clerk sign-in correctly.
- **All data attributes present** — Verified via grep: `data-session-page` (3 occurrences in page states), `data-session-invite` (3 occurrences), `data-session-participants`, `data-session-sets`, `data-presence-indicator`.
- **Heartbeat pattern** — Verified setInterval + clearInterval + useRef + useCallback pattern in session page.
- **useRef guard** — Verified `joinAttempted.current` guard in join page.
- **Slice-level checks passing for T03 scope:**
  - ✅ `tsc --noEmit` web — 0 errors
  - ✅ Middleware: `/session/join/xyz` redirects to Clerk sign-in when not authenticated
  - ⏳ Manual: two browser windows (requires live Convex + authenticated session — deferred to T04/manual verification)
  - ⏳ `verify-s01-m05.ts` — pending live Convex backend (T02 scope)

## Diagnostics

- **Session page** exposes `data-session-page` attribute on container, queryable via `document.querySelectorAll('[data-session-page]')`.
- **Participant presence** queryable via `document.querySelectorAll('[data-presence-indicator]')` — check `className` for `bg-green-500` (active), `bg-yellow-500` (idle), `bg-gray-400` (left).
- **Set feed** queryable via `document.querySelectorAll('[data-session-sets]')`.
- **Join page** queryable via `document.querySelectorAll('[data-session-invite]')`.
- **Console logs**: Heartbeat lifecycle logged as `[Session] Heartbeat started` and `[Session] Heartbeat stopped: unmount` or `[Session] Heartbeat stopped: mutation failed`. Join flow logged as `[Session] Join success: sessionId=...` or `[Session] Join failed: ...`.

## Deviations

- **clsx dependency installed**: The pre-existing `clsx` TS2307 error was blocking the dev server from serving any page. Installed `clsx` via `pnpm -C apps/web add clsx` to make the app functional for browser verification. This resolves a pre-existing blocker noted in STATE.md, not a T03-specific change.
- **Weight/reps handled as optional**: Schema defines `weight` and `reps` as `v.optional(v.number())`, so the SessionSetFeed component handles `undefined` values with fallback display (`—`), not assumed in the plan but necessary for type correctness.

## Known Issues

- None — all must-haves verified.

## Files Created/Modified

- `apps/web/src/middleware.ts` — Added `/session(.*)` to protected route matcher
- `apps/web/src/components/session/SessionParticipantList.tsx` — New: participant list with presence dots and avatar
- `apps/web/src/components/session/SessionSetFeed.tsx` — New: exercise-grouped chronological set feed
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — New: auth-gated join flow with useRef guard
- `apps/web/src/app/workouts/session/[id]/page.tsx` — New: live session view with heartbeat, participant list, set feed
