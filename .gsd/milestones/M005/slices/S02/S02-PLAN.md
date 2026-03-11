# S02: Shared Timer, Session Lifecycle & Combined Summary

**Goal:** Any participant can start a shared rest timer that counts down in sync across all participants' screens, the host can end the session triggering a combined summary view, and abandoned sessions auto-complete after 15 minutes of inactivity.
**Demo:** Two browser windows on the same session — participant A starts a 60s timer, participant B sees countdown within ~1 second. Host clicks "End Session", both windows show combined summary with per-participant stats. A session with stale heartbeats is auto-completed by the timeout cron.

## Must-Haves

- `groupSessions` schema extended with `sharedTimerEndAt`, `sharedTimerDurationSeconds`, and `completedAt` optional fields
- `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer` mutations in `sessions.ts` — any participant can operate (D140 last-write-wins)
- `endSession` mutation — host-only (D141), idempotent with status guard, patches session to "completed" with `completedAt`
- `getSessionSummary` query — aggregates per-participant stats (exercise count, set count, total volume, duration)
- `checkSessionTimeouts` internalMutation — auto-completes sessions with no heartbeats across ALL participants for 15+ minutes
- `checkSessionTimeouts` registered in `crons.ts` at 5-minute interval
- 6 new test helpers in `testing.ts` mirroring the new mutations/queries
- Verification script (`verify-s02-m05.ts`) with 10+ checks covering timer, end session, summary, and timeout
- `SharedTimerDisplay` component on web session page — SVG ring countdown sourced from `useQuery` (not RestTimerContext)
- "End Session" button (host-only) on session page header
- Session page renders combined summary view when `session.status === "completed"` instead of live session view
- `data-session-timer`, `data-session-summary`, `data-session-end-button` attributes on new UI elements (D152 extension)

## Proof Level

- This slice proves: integration (server-authoritative timer + session lifecycle + summary aggregation + timeout cron + web UI consuming all backend state)
- Real runtime required: yes — timer sync across clients requires reactive Convex subscriptions; timeout cron requires scheduler
- Human/UAT required: yes — two-browser timer sync visual confirmation (within ~1s drift), but functional correctness provable via verification script + TypeScript compilation

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `tsc --noEmit` on `apps/web` — 0 errors
- `tsc --noEmit` on `apps/native` — 0 new errors (38 pre-existing TS2307 accepted)
- `npx tsx packages/backend/scripts/verify-s02-m05.ts` — 10+ checks pass (pending live Convex backend)
- `verify-s01-m05.ts` regression — still compiles (no broken imports from S01)
- Web session page renders SharedTimerDisplay with `data-session-timer` attribute
- Web session page renders "End Session" button with `data-session-end-button` attribute (host-only)
- Web session page renders summary view with `data-session-summary` attribute when session status is "completed"

## Observability / Diagnostics

- Runtime signals: `[Session]` prefixed structured logs in `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer`, `endSession`, `checkSessionTimeouts` — consistent with S01 logging pattern
- Inspection surfaces: `getSession` query already spreads session doc — `sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt` automatically visible once schema fields are added. `getSessionSummary` provides per-participant aggregated stats. `checkSessionTimeouts` logs sessions scanned and auto-completed count.
- Failure visibility: `endSession` logs "already completed, skipping" for idempotent calls. `checkSessionTimeouts` wraps per-session processing in try/catch — logs error + continues. Timer mutations log the action and sessionId.
- Redaction constraints: none — no secrets or PII in session timer/lifecycle data

## Integration Closure

- Upstream surfaces consumed: S01's `sessions.ts` (9 functions), `groupSessions` + `sessionParticipants` tables, `crons.ts` (2 existing entries), `testing.ts` (10 session test helpers), session page at `/workouts/session/[id]`, `SessionParticipantList` and `SessionSetFeed` components
- New wiring introduced in this slice: 5 new functions in `sessions.ts` (3 timer mutations + `endSession` + `getSessionSummary`), 1 new internalMutation (`checkSessionTimeouts`), 3rd cron entry in `crons.ts`, `SharedTimerDisplay` component on session page, `SessionSummary` component for completed state, host-only "End Session" button
- What remains before the milestone is truly usable end-to-end: S03 (finishWorkout integration for participant workouts → feed/leaderboard/challenge/badge hooks, comprehensive 15+ check verification with two-browser proof), S04 (mobile port)

## Tasks

- [x] **T01: Extend schema, add 5 backend functions + timeout cron, and 6 test helpers** `est:20m`
  - Why: All S02 backend infrastructure — schema fields, timer mutations, endSession, getSessionSummary, checkSessionTimeouts cron, and test helpers. Everything else depends on this.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/sessions.ts`, `packages/backend/convex/crons.ts`, `packages/backend/convex/testing.ts`
  - Do: Add 3 optional fields to `groupSessions` table definition (`sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt`). Add `startSharedTimer` (sets endAt = Date.now() + duration*1000), `pauseSharedTimer` (clears endAt to undefined), `skipSharedTimer` (clears endAt to undefined), `endSession` (host-only, status guard, patches to "completed" with completedAt), `getSessionSummary` (aggregates per-participant exercise/set/volume stats from workouts→workoutExercises→sets traversal), `checkSessionTimeouts` (internal mutation: sweeps active/waiting sessions, auto-completes if ALL participants have lastHeartbeatAt > 15min AND session.createdAt > 15min ago). Register `checkSessionTimeouts` in crons.ts at 5-minute interval. Add 6 test helpers: `testStartSharedTimer`, `testPauseSharedTimer`, `testSkipSharedTimer`, `testEndSession`, `testGetSessionSummary`, `testCheckSessionTimeouts`.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors. `sessions.ts` exports 15 functions (9 S01 + 6 S02). `crons.ts` has 3 entries. `testing.ts` has 16 session helpers.
  - Done when: Backend compiles with 0 errors, all new functions and test helpers are exported and type-safe

- [x] **T02: Verification script for S02 backend** `est:15m`
  - Why: Proves backend correctness before building UI. Exercises timer mutations, endSession lifecycle, summary aggregation, and session timeout.
  - Files: `packages/backend/scripts/verify-s02-m05.ts`
  - Do: Create verification script with 10+ checks: SS-13 (startSharedTimer sets sharedTimerEndAt in future), SS-14 (pauseSharedTimer clears sharedTimerEndAt), SS-15 (skipSharedTimer clears sharedTimerEndAt), SS-16 (startSharedTimer by non-host works — D140 last-write-wins), SS-17 (endSession by host sets status to "completed" and completedAt), SS-18 (endSession by non-host rejected), SS-19 (endSession idempotent — second call doesn't throw), SS-20 (getSessionSummary returns per-participant stats with correct exercise/set counts), SS-21 (checkSessionTimeouts auto-completes session with all-stale heartbeats), SS-22 (checkSessionTimeouts skips session with recent heartbeat). Use same ConvexHttpClient + check() runner pattern as verify-s01-m05.ts. Cleanup in finally block.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — script compiles. Check IDs SS-13 through SS-22 all defined.
  - Done when: Verification script compiles cleanly with 10 checks covering all S02 backend behavior

- [x] **T03: Web UI — SharedTimerDisplay, End Session button, and Summary view** `est:25m`
  - Why: Delivers the user-facing S02 experience: synchronized timer display, host-only session end, and combined summary. Extends the existing session page.
  - Files: `apps/web/src/components/session/SharedTimerDisplay.tsx`, `apps/web/src/components/session/SessionSummary.tsx`, `apps/web/src/app/workouts/session/[id]/page.tsx`
  - Do: Build `SharedTimerDisplay` component: reads `sharedTimerEndAt` and `sharedTimerDurationSeconds` from session prop, computes `remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))` locally via `setInterval(100ms)`, renders SVG progress ring (copy ProgressRing pattern from RestTimerDisplay.tsx) + `formatRestTime` display + Start/Pause/Skip buttons that call `startSharedTimer`/`pauseSharedTimer`/`skipSharedTimer` mutations. Timer states: idle (no endAt or endAt in past → show duration picker + start button), running (endAt in future → countdown + pause/skip), done (remaining hit 0 → "Done!" for 3s then idle). `data-session-timer` attribute. Build `SessionSummary` component: calls `useQuery(api.sessions.getSessionSummary)` with sessionId, renders per-participant cards with displayName, exercise count, set count, total volume (formatted with user's unit preference), and workout duration. `data-session-summary` attribute. Modify session page: add SharedTimerDisplay between header and grid (visible when session not completed). Add "End Session" button in header (visible only to host, `data-session-end-button`, disabled state while ending). Add conditional rendering: when `session.status === "completed"`, render SessionSummary instead of live session grid.
  - Verify: `tsc --noEmit` on `apps/web` — 0 errors. Session page has SharedTimerDisplay, End Session button, and SessionSummary components with correct data attributes.
  - Done when: Web session page renders timer (idle state), shows "End Session" for host, and switches to summary view when session is completed — all with 0 TypeScript errors

- [x] **T04: TypeScript compilation gate and regression check** `est:5m`
  - Why: Final compilation gate ensuring S02 changes don't break any package, plus regression check on S01 verification script.
  - Files: (no new files — compilation check across all packages)
  - Do: Run `tsc --noEmit` on all 3 packages (backend, web, native). Verify `verify-s01-m05.ts` still compiles (no broken imports). Verify `verify-s02-m05.ts` compiles. Verify `crons.ts` has 3 entries. Verify `sessions.ts` has 15 exported functions. Verify `testing.ts` has 16 session test helpers.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors. `tsc --noEmit` apps/web — 0 errors. `tsc --noEmit` apps/native — 0 new errors.
  - Done when: All 3 packages compile, both verification scripts compile, no regressions from S01

## Files Likely Touched

- `packages/backend/convex/schema.ts` — Add 3 optional fields to `groupSessions`
- `packages/backend/convex/sessions.ts` — Add 5 exported functions + 1 internalMutation
- `packages/backend/convex/crons.ts` — Add 3rd cron entry for `checkSessionTimeouts`
- `packages/backend/convex/testing.ts` — Add 6 session test helpers
- `packages/backend/scripts/verify-s02-m05.ts` — New verification script
- `apps/web/src/components/session/SharedTimerDisplay.tsx` — New timer component
- `apps/web/src/components/session/SessionSummary.tsx` — New summary component
- `apps/web/src/app/workouts/session/[id]/page.tsx` — Extend with timer, end button, summary view
