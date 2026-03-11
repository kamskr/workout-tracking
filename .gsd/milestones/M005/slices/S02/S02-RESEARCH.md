# S02: Shared Timer, Session Lifecycle & Combined Summary — Research

**Date:** 2026-03-11

## Summary

S02 adds three capabilities on top of S01's session infrastructure: (1) a server-authoritative shared rest timer that all participants see counting down in sync, (2) session lifecycle completion — host can end the session and abandoned sessions auto-complete after 15 minutes of inactivity, and (3) a combined summary view showing all participants' workout stats when the session ends.

All three capabilities follow established patterns in the codebase. The shared timer is a schema extension (two optional fields on `groupSessions`) plus a few mutations — the client-side rendering reuses the existing `RestTimerDisplay` SVG ring and `formatRestTime` utility but sources state from server rather than local context. Session completion mirrors the challenge completion pattern (`completeChallenge` idempotent mutation + status guards). The session timeout cron follows the exact same shape as `cleanupPresence` — iterating active sessions and checking a timestamp threshold. The combined summary is a single query that aggregates participant workout data using the existing `getSessionSets` traversal pattern enriched with per-participant duration and set counts.

**Primary recommendation:** Implement backend first (schema extension + 5 new functions + cron addition + test helpers), then verification script, then web UI additions to the existing session page. The schema change is additive-only (two optional fields on an existing table), requiring no migration of existing data. The web UI extends the session page layout with a timer component and end/summary sections — no new routes needed.

## Recommendation

**Task ordering: Schema + mutations/queries → Cron for session timeout → Test helpers → Verification script → Web UI (timer + end + summary).**

Schema and backend functions first because everything else depends on them. The cron for session timeouts follows naturally from the backend — it's a near-copy of `cleanupPresence` with different conditions. Test helpers mirror the auth-gated mutations (same pattern as every prior slice). The verification script exercises the new functions. Web UI comes last because it's pure presentation consuming backend state that's already proven.

The shared timer is the technically novel element — server stores `sharedTimerEndAt` as an absolute timestamp, clients compute `remaining = timerEndAt - Date.now()` locally. This is the wall-clock arithmetic pattern already proven in `RestTimerContext` (D032), just sourced from Convex reactive subscription instead of local state. Drift is bounded by NTP clock skew between client devices (typically <1 second), which is within the 1-second acceptance criterion from the roadmap.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Timer countdown display | `RestTimerDisplay.tsx` SVG ring + `formatRestTime` from `lib/units.ts` | Proven circular progress ring with exact visual pattern needed. Shared timer component can copy the SVG ring logic, sourcing state from `useQuery` instead of `useRestTimer` context. |
| Session completion state machine | `completeChallenge` in `challenges.ts` (idempotent, status-guarded) | Identical pattern: check status → return early if already completed → patch status + completedAt. Copy the guard structure. |
| Session timeout via cron | `cleanupPresence` in `sessions.ts` + `checkDeadlines` in `challenges.ts` | Exact same cron-driven sweep pattern. Iterate sessions with `by_status` index, check timestamp threshold, patch matching documents. |
| Combined summary aggregation | `getSessionSets` query pattern (workouts → workoutExercises → sets traversal) | Same 3-level traversal. Summary adds aggregation (count exercises, sum volume, count sets) on top of the data already fetched by this pattern. |
| Test helpers with testUserId | `testing.ts` session helpers (`testCreateSession`, `testJoinSession`, etc.) | 10 existing session helpers. New helpers (`testEndSession`, `testStartSharedTimer`, `testGetSessionSummary`, etc.) follow the exact same shape. |
| Verification script runner | `verify-s01-m05.ts` check/cleanup pattern | Same ConvexHttpClient + `check()` function + try/finally cleanup. Extend with new check IDs (SS-13 through SS-22+). |
| Participant workout stats | `computePeriodSummary` in `analytics.ts` (volume, exercise count) | Reusable for per-participant summary stats. However, the session summary is simpler — just count exercises, sets, volume from the workout's own data. Direct aggregation is more appropriate than calling the general analytics function. |

## Existing Code and Patterns

### Backend — Direct Reuse

- `packages/backend/convex/sessions.ts` — **S02 extends this file.** 9 functions from S01 provide the session infrastructure. S02 adds 5 new functions: `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer`, `endSession` (mutations), `getSessionSummary` (query), and `checkSessionTimeouts` (internalMutation). The existing `cleanupPresence` pattern is the structural template for `checkSessionTimeouts`. The existing `getSession` query already returns `sharedTimerEndAt` and `sharedTimerDurationSeconds` once the schema fields are added — no query modification needed for timer state delivery to clients.

- `packages/backend/convex/schema.ts` — `groupSessions` table needs two optional fields: `sharedTimerEndAt: v.optional(v.number())` and `sharedTimerDurationSeconds: v.optional(v.number())`. Also add `completedAt: v.optional(v.number())` for session completion timestamp. The `sessionStatus` validator already includes `"completed"` — no validator change needed. These are all additive `v.optional()` fields, so existing S01 data is unaffected.

- `packages/backend/convex/challenges.ts` lines 29–66 — `completeChallenge` is the direct template for `endSession`: check document exists → check status guard ("active" or "waiting") → patch to "completed" with `completedAt` → log. The idempotent "already completed, skipping" early-return pattern is critical to prevent race conditions.

- `packages/backend/convex/challenges.ts` lines 104–150 — `checkDeadlines` internal mutation is the template for `checkSessionTimeouts`: iterate documents by status index → check timestamp condition → patch matching documents. The session timeout checks `lastHeartbeatAt` across ALL participants — if no participant has a heartbeat within 15 minutes, auto-complete the session.

- `packages/backend/convex/crons.ts` — Currently has 2 cron entries. S02 adds a third: `checkSessionTimeouts` at a longer interval (e.g., every 5 minutes — no need for 30-second frequency since 15-minute timeout is the threshold). The cron file pattern is simple: `crons.interval("name", { minutes: N }, internal.sessions.functionName)`.

- `packages/backend/convex/testing.ts` (3,334 lines) — 10 existing session test helpers. S02 adds ~5-7 more: `testEndSession`, `testStartSharedTimer`, `testPauseSharedTimer`, `testSkipSharedTimer`, `testGetSessionSummary`, `testCheckSessionTimeouts`. Each follows the same `mutation({ args: { testUserId, sessionId, ... }, handler: async (ctx, args) => { ... } })` pattern.

- `packages/backend/convex/workouts.ts` lines 37–130 — `finishWorkout` mutation with 4 non-fatal hooks. **S02 does NOT modify `finishWorkout`** — that's S03's job (integrating session participant workout completion with feed/leaderboard/challenge/badge hooks). S02 only handles session-level lifecycle (endSession), not individual workout completion.

### Frontend — Direct Reuse

- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — The SVG `ProgressRing` component (lines 14–53) and the control button patterns (pause/play/skip) are the visual template for `SharedTimerDisplay`. The shared timer version will be simpler: no `adjustTimer(±15s)` needed (D140 last-write-wins means any participant just starts a new timer), and state comes from `useQuery` instead of `useRestTimer` context. The `formatRestTime` utility from `lib/units.ts` is reused directly.

- `apps/web/src/app/workouts/session/[id]/page.tsx` — **S02 extends this page.** Current layout has header + 2-column grid (participants sidebar + set feed). S02 adds: (a) `SharedTimerDisplay` component between header and grid or as a floating widget, (b) "End Session" button in header (host-only), (c) conditional rendering: when `session.status === "completed"`, show summary view instead of live session view. The heartbeat useEffect already stops for completed sessions (line ~54: `if (session.status === "completed") return;`).

- `apps/web/src/components/session/SessionParticipantList.tsx` — Used as-is. No modifications needed for S02. Presence dots already handle "active"/"idle"/"left" states.

- `apps/web/src/components/session/SessionSetFeed.tsx` — Used as-is in live view. For the completed summary view, a different component (`SessionSummary`) aggregates the same data differently (per-participant stats rather than chronological feed).

### Patterns to Follow

- **Idempotent mutations with status guards** — `endSession` must check `session.status !== "completed"` before patching. Same pattern as `completeChallenge`. Prevents race conditions from multiple participants or double-clicks.
- **Server-authoritative timestamps** — `sharedTimerEndAt = Date.now() + durationSeconds * 1000` in the mutation. `Date.now()` is frozen per mutation (Convex guarantee), so all reads of the stored value are deterministic.
- **Last-write-wins for timer** (D140) — `startSharedTimer` unconditionally overwrites `sharedTimerEndAt` and `sharedTimerDurationSeconds`. No locking, no ownership check. Any participant can start/pause/skip.
- **Host-only end/cancel** (D141) — `endSession` checks `session.hostId === userId` and rejects non-hosts. Same pattern as challenge creator privileges (D125).
- **Non-fatal cron** — `checkSessionTimeouts` should be resilient — wrap per-session processing in try/catch so one bad session doesn't prevent others from being timed out.
- **Data attributes** (D152) — New UI elements get `data-session-timer`, `data-session-summary`, `data-session-end-button` attributes for programmatic verification.

### Patterns to Avoid

- **Don't use `RestTimerContext` for shared timer** — The existing context is local-only (D008). The shared timer reads from Convex `useQuery(api.sessions.getSession)` which already subscribes to the `groupSessions` document. Creating a new context provider for shared timer would add unnecessary abstraction.
- **Don't call `finishWorkout` inside `endSession`** — S02 focuses on session lifecycle. Individual workout completion (finishWorkout + hooks) is S03 scope. `endSession` patches the session document and participant statuses, but does NOT touch the `workouts` table or trigger feed/leaderboard/badge hooks. This keeps the scope bounded and testable.
- **Don't add complex pause/resume semantics** — "Pause" the shared timer means clearing `sharedTimerEndAt` (setting to null). "Resume" isn't needed — the user starts a new timer. This matches gym behavior: you either wait or you restart the clock.

## Constraints

- **Schema additive only** — `sharedTimerEndAt`, `sharedTimerDurationSeconds`, and `completedAt` are all `v.optional()` additions to `groupSessions`. No migration needed for existing session documents.

- **`_generated/api.d.ts` must be manually updated** — S01 Forward Intelligence warns that `npx convex dev` hasn't run. The file was manually edited to include the sessions module. S02 adds new exports to `sessions.ts` but no new modules, so the `_generated/api.d.ts` import of `sessions.ts` already covers new exports. No manual edit needed for module registration — only if new lib files are added.

- **Cron interval selection for timeout check** — 30 seconds (like presence cleanup) is excessive for a 15-minute timeout threshold. Every 5 minutes is sufficient — 20-minute worst case (15 min threshold + 5 min cron interval) which is acceptable for abandoned session cleanup. This reduces write cost from the cron scan.

- **`getSession` query already spreads session doc** — The existing `getSession` does `return { ...session, participantCount, host }`. Once `sharedTimerEndAt` and `sharedTimerDurationSeconds` exist on the doc, they automatically appear in the query response. **No query modification needed for timer state delivery.**

- **Heartbeat stops for completed sessions** — The session page's useEffect already has `if (session.status === "completed") return;` guard. When `endSession` transitions status to "completed", Convex's reactive subscription updates `session.status`, triggering the useEffect cleanup which stops the heartbeat interval. This is already correct from S01.

- **Session page conditional rendering** — The page currently has loading, error, and session-view states. S02 adds a fourth state: when `session.status === "completed"`, render the summary view instead of the live session view. This is a simple conditional branch in the JSX.

## Common Pitfalls

- **Timer "pause" semantics confusion** — If "pause" stores `remaining` seconds and expects "resume" to recompute `endAt`, the state machine becomes complex with three timer states (running/paused/idle). **Avoid this.** Instead: "pause" = clear `sharedTimerEndAt` to null (timer stops). "Start" = set `sharedTimerEndAt = Date.now() + duration * 1000`. No "resume" — user just starts a new timer. This keeps the mutation logic trivial and the client rendering simple: if `sharedTimerEndAt` exists and is in the future, show countdown; otherwise, show idle/start button.

- **Timer expiry rendering on client** — When `sharedTimerEndAt` is in the past (timer expired), the client should show "Done!" briefly, then idle. Without care, the client will show negative remaining time. **Mitigation:** Client computes `remaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000))`. When remaining hits 0, render the completed state. Use a local `setInterval(100ms)` for smooth countdown, same as `RestTimerContext`.

- **Race condition: endSession during active timer** — Host ends session while timer is running. Timer display tries to render but session.status is now "completed". **Mitigation:** SharedTimerDisplay checks `session.status !== "completed"` before rendering. When status changes to completed, the component unmounts or switches to summary view.

- **checkSessionTimeouts marking recently-created sessions** — A session created 1 minute ago with no participants yet (besides the host who's idle) could be auto-completed if the timeout check runs. **Mitigation:** Check `session.createdAt` — only timeout sessions that have been alive for at least 15 minutes AND have no recent heartbeats. Alternatively, check all participants' `lastHeartbeatAt` — if any participant has a heartbeat within 15 minutes, the session is still alive.

- **endSession called on "waiting" session** — Host creates a session, nobody joins, host wants to end it. Should this work? **Yes** — `endSession` should accept both "waiting" and "active" sessions. The status guard rejects only "completed" and "cancelled". For "waiting" sessions with no other participants, the summary is trivially the host's own workout data.

- **Double-click on "End Session" button** — Without protection, two rapid clicks could call endSession twice. The mutation is idempotent (status guard returns early if already completed), so the second call is harmless. But the UI should disable the button after first click to prevent user confusion. Use a local `useState(ending)` flag.

- **Summary data fetching after session completes** — `getSessionSummary` needs to aggregate data from completed workouts. But `endSession` doesn't call `finishWorkout` (that's S03). So at S02 scope, participant workouts may still be "inProgress" when the summary is viewed. **Mitigation:** `getSessionSummary` aggregates set data regardless of workout status. It counts exercises, sets, and volume from the session's workout data. Workout status (inProgress vs completed) doesn't affect the sets already logged.

## Open Risks

- **Timer accuracy across clients** — NTP clock skew between two browser clients can cause up to ~1 second difference in displayed countdown. This is within the acceptance criterion ("within ~1 second drift" per roadmap). If clients have significantly wrong clocks (manual time change, VM without NTP), drift could be larger. This is a platform limitation, not a bug to fix.

- **Session timeout false positives** — If all participants temporarily lose connectivity (e.g., gym WiFi drops), heartbeats stop, and the 15-minute timeout could trigger. When connectivity resumes, the session is already completed. **Mitigation:** 15 minutes is generous — unlikely all participants lose connectivity for that long. If it happens, they can create a new session. Acceptable for MVP.

- **`getSessionSummary` query cost** — For a 10-participant session with ~20 exercises each and ~5 sets per exercise, the query reads ~10 workouts + ~200 workoutExercises + ~1000 sets + 10 profiles = ~1220 documents. Well within Convex's 16K read limit and 10-second query timeout.

- **`_generated/api.d.ts` manual edit risk** — S01 warned that `npx convex dev` will overwrite the manual sessions module registration. This risk persists through S02. Since S02 doesn't add new module files (just extends `sessions.ts` and `testing.ts`), no new manual edits to `api.d.ts` are needed. The risk is that a dev server run might temporarily break things by regenerating this file.

- **Testing endSession + summary without finishWorkout** — S02's `endSession` patches the session to "completed" but doesn't complete individual workouts. The summary view shows sets logged so far, not "completed workout" stats. This is intentional — S03 handles the `finishWorkout` integration. But it means S02's summary shows "in progress" workout data, which is functionally correct (sets are sets regardless of workout status) but semantically incomplete.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` (4.6K installs) | available — recommended for Convex mutation/query patterns |
| Convex Best Practices | `waynesutton/convexskills@convex-best-practices` (2K installs) | available — useful for cron and scheduling patterns |
| Convex Functions | `waynesutton/convexskills@convex-functions` (1.5K installs) | available — relevant to internal mutation patterns |

**Note:** Same skills as M005 research. None installed. The codebase already has 9 proven session functions + 10 test helpers to copy from — Convex skill is helpful but not critical for this slice.

## Sources

- `Date.now()` frozen per mutation — deterministic timer storage (source: Convex Runtimes Docs, confirmed by M005-RESEARCH.md)
- `crons.interval` supports seconds granularity — 5-minute interval for timeout check is safe (source: existing `crons.ts` with 30-second presence interval)
- Convex reactive queries auto-deliver timer state changes — no polling or WebSocket layer needed (source: established pattern across all existing `useQuery` subscriptions in the app)
- Idempotent completion mutation pattern — `completeChallenge` in challenges.ts proves the status-guard approach (source: D111, codebase)
- `getSession` already spreads session document — adding optional fields to schema automatically exposes them in query response (source: sessions.ts line ~231: `return { ...session, participantCount, host }`)
- RestTimerDisplay SVG ring and formatRestTime utility — proven client-side countdown rendering (source: RestTimerDisplay.tsx, lib/units.ts)
- Session page heartbeat stops for completed sessions — existing guard at line ~54 of session page (source: apps/web/src/app/workouts/session/[id]/page.tsx)
