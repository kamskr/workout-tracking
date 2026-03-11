---
estimated_steps: 5
estimated_files: 3
---

# T03: Web UI — SharedTimerDisplay, End Session button, and Summary view

**Slice:** S02 — Shared Timer, Session Lifecycle & Combined Summary
**Milestone:** M005

## Description

Build the three web UI additions for S02: (1) `SharedTimerDisplay` component with SVG progress ring countdown sourced from Convex reactive subscription, (2) `SessionSummary` component showing per-participant workout stats for completed sessions, (3) integrate both into the session page with host-only "End Session" button and conditional rendering based on session status.

## Steps

1. **Build `SharedTimerDisplay.tsx`** in `apps/web/src/components/session/`:
   - Props: `session` object (containing `sharedTimerEndAt`, `sharedTimerDurationSeconds`, `status`), `sessionId` for mutations
   - Timer state machine (computed from props, not local state machine):
     - **idle**: `sharedTimerEndAt` is undefined/null or in the past (and not within 3s grace) → show duration preset buttons (30s, 60s, 90s, 120s) + "Start Timer" 
     - **running**: `sharedTimerEndAt` in the future → show countdown ring + Pause/Skip buttons
     - **done**: remaining just hit 0 (within 3s window) → show "Done!" then transition to idle
   - Countdown: `useEffect` with `setInterval(100)` computing `remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))`. Store in local `useState(remaining)`.
   - SVG ring: Copy `ProgressRing` from `RestTimerDisplay.tsx` (ring size, stroke width, circumference math). Use `formatRestTime` from `@/lib/units`.
   - Mutations: `useMutation(api.sessions.startSharedTimer)`, `useMutation(api.sessions.pauseSharedTimer)`, `useMutation(api.sessions.skipSharedTimer)`. Wire to buttons.
   - Duration selection: Default to last `sharedTimerDurationSeconds` if available, else 60s. Quick-select buttons for 30/60/90/120s.
   - `data-session-timer` attribute on outer container.
   - Do NOT render when `session.status === "completed"`.

2. **Build `SessionSummary.tsx`** in `apps/web/src/components/session/`:
   - Props: `sessionId`
   - Calls `useQuery(api.sessions.getSessionSummary, { sessionId })`.
   - Loading state: simple spinner.
   - Renders session summary header (session completed time, total participants).
   - Renders per-participant cards in a grid: display name, exercise count, set count, total volume (formatted using `formatWeight` from `@/lib/units` with "kg" default — unit preference is per-user but summary is cross-user, so show kg), workout duration (formatted as Xm or Xh Ym).
   - `data-session-summary` attribute on outer container.

3. **Modify session page** `apps/web/src/app/workouts/session/[id]/page.tsx`:
   - Import `SharedTimerDisplay` and `SessionSummary`.
   - Import `useMutation(api.sessions.endSession)`.
   - **Conditional rendering**: When `session.status === "completed"`, render `SessionSummary` instead of the live session grid (participants + set feed). Keep the header visible but modify it: hide invite link section, show "Session Completed" status badge.
   - **SharedTimerDisplay placement**: Between header and grid, visible only when `session.status !== "completed"`. Pass session object and sessionId.
   - **End Session button**: In header, visible only when current user is host (`session.hostId === userId`). Need `useUser()` from Clerk to get current userId. Button text "End Session", red/danger styling. `useState(ending)` flag for disabled state during mutation. On click: call `endSession({ sessionId })`. `data-session-end-button` attribute.
   - **Get current userId**: Use `useUser()` from `@clerk/nextjs` to get `user.id` for host comparison.

4. **Wire imports and ensure type safety**: Verify that `api.sessions.startSharedTimer`, `api.sessions.pauseSharedTimer`, `api.sessions.skipSharedTimer`, `api.sessions.endSession`, and `api.sessions.getSessionSummary` all resolve through the existing `_generated/api.d.ts` (sessions module already registered from S01). No manual api.d.ts edits needed since we're extending an existing module.

5. **Verify compilation**: `tsc --noEmit` on `apps/web` — 0 errors. Spot-check: all 3 `data-*` attributes present in source.

## Must-Haves

- [ ] `SharedTimerDisplay` computes countdown locally from `sharedTimerEndAt` via `setInterval(100ms)` — NOT from server polling
- [ ] `SharedTimerDisplay` SVG ring uses same circumference/progress math as `RestTimerDisplay`
- [ ] Timer idle state shows duration preset buttons (30s/60s/90s/120s) + start
- [ ] Timer mutations (`startSharedTimer`/`pauseSharedTimer`/`skipSharedTimer`) wired to buttons
- [ ] `SessionSummary` renders per-participant exercise count, set count, total volume, duration
- [ ] "End Session" button visible only to host, uses `useState(ending)` for disabled state
- [ ] Session page switches to summary view when `session.status === "completed"`
- [ ] `data-session-timer`, `data-session-summary`, `data-session-end-button` attributes present
- [ ] SharedTimerDisplay hidden when session is completed

## Verification

- `tsc --noEmit` on `apps/web` — 0 errors
- `grep "data-session-timer" apps/web/src/components/session/SharedTimerDisplay.tsx` — found
- `grep "data-session-summary" apps/web/src/components/session/SessionSummary.tsx` — found
- `grep "data-session-end-button" apps/web/src/app/workouts/session/\\[id\\]/page.tsx` — found
- All component imports resolve (no unresolved module errors)

## Observability Impact

- Signals added/changed: Client-side `console.log("[Session] Timer started/paused/skipped")` in mutation callbacks for debugging timer UI issues. `console.log("[Session] End session requested")` on button click.
- How a future agent inspects this: `data-session-timer`, `data-session-summary`, `data-session-end-button` CSS selectors enable programmatic browser assertions. Timer state derivable from `sharedTimerEndAt` field in `getSession` query response.
- Failure state exposed: Mutation errors caught and logged to console. `ending` state flag prevents double-click confusion on End Session.

## Inputs

- `packages/backend/convex/sessions.ts` — T01's new functions (startSharedTimer, pauseSharedTimer, skipSharedTimer, endSession, getSessionSummary)
- `apps/web/src/app/workouts/session/[id]/page.tsx` — S01's session page (header + 2-column grid + heartbeat)
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — ProgressRing SVG pattern to copy
- `apps/web/src/lib/units.ts` — `formatRestTime`, `formatWeight` utilities
- `apps/web/src/components/session/SessionParticipantList.tsx` — existing component, used as-is in live view
- `apps/web/src/components/session/SessionSetFeed.tsx` — existing component, used as-is in live view

## Expected Output

- `apps/web/src/components/session/SharedTimerDisplay.tsx` — New: SVG ring timer with start/pause/skip, sourced from Convex reactive session data
- `apps/web/src/components/session/SessionSummary.tsx` — New: per-participant workout stats for completed sessions
- `apps/web/src/app/workouts/session/[id]/page.tsx` — Modified: SharedTimerDisplay between header and grid, End Session button for host, conditional summary view on completion
