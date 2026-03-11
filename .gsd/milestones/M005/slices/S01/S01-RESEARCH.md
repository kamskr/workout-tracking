# S01: Session Creation, Joining, Presence & Live Set Feed — Research

**Date:** 2026-03-11

## Summary

S01 is the highest-risk slice in M005, introducing the project's first multi-user realtime mutation pattern: heartbeat-based presence. The core deliverables are two new Convex tables (`groupSessions`, `sessionParticipants`), a new `sessions.ts` module with 6 functions (create, join, leave, heartbeat, getSession, getSessionParticipants, getSessionSets), a 30-second cron for presence cleanup, and two new web pages (`/workouts/session/[id]` and `/session/join/[inviteCode]`). The existing codebase provides strong structural templates: `challenges.ts` for lifecycle state machines with participant tables, `testing.ts` for multi-user test helpers, `crons.ts` for interval jobs, and `ActiveWorkout.tsx` for the workout creation guard pattern.

The primary risk is subscription churn from heartbeat writes. Every 10-second heartbeat updates `lastHeartbeatAt` on the participant document, which refires any query subscribed to `sessionParticipants`. The session set feed query (`getSessionSets`) must be designed to NOT subscribe to participant documents — it should read from `workoutExercises` and `sets` tables using the participant's `workoutId`, not from `sessionParticipants` directly. This keeps the set feed reactive only to actual set changes, not heartbeat noise.

**Primary recommendation:** Build schema + mutations first, then cron, then test helpers and verification script, then web UI. Keep the session set feed query separate from the participant presence query to avoid subscription coupling. Follow the `challengeParticipants` table pattern exactly — separate documents per participant with composite indexes.

## Recommendation

**Approach: Two-query architecture to isolate heartbeat churn from set feed reactivity.**

The session page will use two separate `useQuery` subscriptions:
1. `getSessionParticipants(sessionId)` — returns participant list with presence status derived from `lastHeartbeatAt`. This refires on every heartbeat write (~every 10s per participant). Acceptable because it's a lightweight list of names + status indicators.
2. `getSessionSets(sessionId)` — returns all participants' sets aggregated across their individual workouts. This does NOT read from `sessionParticipants` at all — it queries `workouts` by `sessionId` (new index needed on workouts table), then joins through `workoutExercises` → `sets`. This only refires when actual sets are logged.

A third query `getSession(sessionId)` returns the session document itself (status, inviteCode, hostId). This is nearly static — only changes on session state transitions.

This three-query design ensures that heartbeat writes (~60/min for 10 participants) only trigger re-renders of the participant list, not the entire set feed.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Session lifecycle state machine | `challenges.ts` completeChallenge/activateChallenge pattern | Idempotent status guards (`if (status !== "active") return`) prevent race conditions. Session uses identical pattern: `waiting → active → completed/cancelled`. |
| Participant join with cap + dedup | `challenges.ts` joinChallenge pattern | Composite index `by_sessionId_userId` for dedup check, `.collect().length` for cap check. Identical to `by_challengeId_userId`. |
| Host-only privilege guards | `challenges.ts` cancelChallenge pattern | `if (challenge.creatorId !== userId) throw`. Session uses `if (session.hostId !== userId) throw` for end/cancel. |
| Multi-user test helpers | `testing.ts` testCreateProfile/testFollowUser pattern | 2,833 lines of proven pattern with `testUserId` arg bypassing Clerk. Extend with `testCreateSession`, `testJoinSession`, `testSendHeartbeat`, etc. |
| Verification script runner | `verify-s02-m04.ts` ConvexHttpClient pattern | `getConvexUrl()` helper, `check()` result collector, summary printer. Copy the structure exactly. |
| Cron interval job | `crons.ts` existing challenge deadline cron | Add a second `crons.interval("cleanup session presence", { seconds: 30 }, internal.sessions.cleanupPresence)` alongside the existing 15-min cron. |
| Auth-gated mutations | `getUserId(ctx)` from `lib/auth.ts` | Every session mutation follows `const userId = await getUserId(ctx); if (!userId) throw`. |
| Conditional query loading | `useQuery(api.fn, condition ? args : "skip")` (D085) | Session page loads queries only after session ID is resolved from URL params. |
| Workout creation flow | `ActiveWorkout.tsx` useRef guard (D022) | Session join creates a participant workout — needs the same double-creation guard. |
| Route protection | `middleware.ts` Clerk route matcher | Add `/session(.*)` to the protected route matcher for `/session/join/[inviteCode]`. `/workouts/session/[id]` is already covered by `/workouts(.*)`. |

## Existing Code and Patterns

### Backend — Direct Reuse

- `packages/backend/convex/schema.ts` — 21-table schema with shared validators. Add `groupSessions` and `sessionParticipants` tables following the same `defineTable` + index pattern. Add `sessionId: v.optional(v.id("groupSessions"))` to `workouts` table. Export new validators (`sessionStatus`, `participantStatus`) alongside existing exports.
- `packages/backend/convex/challenges.ts` — **Primary template for the entire sessions.ts module.** The `createChallenge` → `joinChallenge` → `leaveChallenge` → `cancelChallenge` pattern maps directly to `createSession` → `joinSession` → `leaveSession` → lifecycle mutations. The `completeChallenge` idempotent guard (`if (status !== "active") return`) is the template for session completion. The `checkDeadlines` cron pattern maps to `cleanupPresence`.
- `packages/backend/convex/crons.ts` — Currently 11 lines with one cron job. Adding a second `crons.interval` for presence cleanup is trivial. Both crons use `internal.*` references.
- `packages/backend/convex/workouts.ts` — `createWorkout` is the per-participant workout creation pattern. `finishWorkout` with 4 non-fatal hooks shows how session completion should trigger individual workout finalization. `getWorkoutWithDetails` shows the multi-table join pattern (`workoutExercises` → `sets`) that `getSessionSets` will reuse.
- `packages/backend/convex/sets.ts` — `logSet` is the primary set creation path. Participants in a session log sets through the same `logSet` mutation (since they have individual workouts). No modification needed — the session set feed reads from the same `sets` table.
- `packages/backend/convex/testing.ts` — 2,833 lines of multi-user test helpers. The `testCreateProfile`, `testFollowUser`, `testCreateFeedItem` patterns with `testUserId` args scale directly to session test helpers. New helpers: `testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testGetSession`, `testGetSessionParticipants`, `testGetSessionSets`, `testLeaveSession`.
- `packages/backend/convex/lib/auth.ts` — `getUserId(ctx)` pattern. All session mutations use this.
- `packages/backend/convex/lib/challengeCompute.ts` — Template for a `sessionCompute.ts` helper if needed. Pure function accepting `db` + IDs, called from mutations. May not be needed for S01 if computation is simple enough to inline.

### Frontend — Direct Reuse

- `apps/web/src/middleware.ts` — Clerk route matcher. Currently protects `/workouts(.*)` (covers `/workouts/session/[id]`). Must add `/session(.*)` for the join route at `/session/join/[inviteCode]`.
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — `useRef` guard against double-creation (D022). Session join page needs the same pattern to prevent duplicate participant creation on React strict mode.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` + `SetRow.tsx` — Set display and logging components. The session page can reuse these for the participant's own set logging, while a separate read-only component shows other participants' sets.
- `apps/web/src/components/feed/FeedItem.tsx` — Social display with avatar, name, relative time. Session participant card follows the same component pattern (avatar + name + presence dot).
- `apps/web/src/app/shared/[id]/page.tsx` — Public route pattern with loading/error/data states. The session join page follows the same structure but is auth-gated.
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — SVG circular countdown. Can be reused in S02 for the shared timer. Not needed in S01.
- `apps/web/src/app/workouts/active/page.tsx` — Active workout page pattern. The session page at `/workouts/session/[id]` follows a similar layout but with participant list sidebar and shared set feed.

### Patterns to Follow

- **Non-fatal hook pattern** — Session-related side effects (if any in S01) wrapped in try/catch. The heartbeat mutation itself should never fail — it's a simple `ctx.db.patch`.
- **Data attributes for testing** — `data-session-page`, `data-session-participants`, `data-session-sets`, `data-session-invite`, `data-presence-indicator` following D057/D064/D082/D090/D099/D118/D124/D130 convention.
- **Conditional query with "skip"** — `useQuery(api.sessions.getSession, sessionId ? { sessionId } : "skip")` per D085.
- **Separate module file** — New `sessions.ts` per D142. Not added to workouts.ts or social.ts.
- **Idempotent mutation guards** — Every state-changing mutation checks current status before transitioning.

### Patterns to Avoid

- **Single monolithic session query** — Don't return participants + their sets + session details in one query. Heartbeat writes would refire the entire response. Split into 3 queries (D137 rationale).
- **Optimistic updates for collaborative state** — Don't use Convex optimistic updates for set feed or presence. Multiple concurrent writers make reconciliation brittle. Let reactive queries handle it (D092 rationale extended).
- **Reading participants inside getSessionSets** — The set feed query must traverse `workouts.by_sessionId → workoutExercises → sets`, NOT `sessionParticipants → workoutId → sets`. The former avoids subscribing to the participants table.

## Constraints

- **Schema migration** — Adding `groupSessions` and `sessionParticipants` tables requires `npx convex dev` to push. Adding optional `sessionId` to `workouts` table is additive (no existing data affected). New index `by_sessionId` on workouts is needed for the set feed query.
- **Convex cron minimum interval** — 1 second minimum. 30-second presence cleanup interval is safe. Two crons in `crons.ts` is fine — Convex supports multiple.
- **Convex mutation `Date.now()` is frozen** — All timestamps within a single mutation are identical. Heartbeat writes use `Date.now()` for `lastHeartbeatAt` — this is correct since each heartbeat is a separate mutation invocation.
- **Convex 10-second query timeout** — `getSessionSets` for 10 participants × ~20 exercises × ~5 sets = ~1000 document reads. Well within limits. Bounded by `.take(100)` on sets per exercise.
- **Convex 16K document read limit per mutation** — `cleanupPresence` cron reads all "active" sessions, then all participants for each. For reasonable session counts (<100 concurrent sessions), this is safe. Add `.take(1000)` safety bounds.
- **Invite code uniqueness** — 6-char alphanumeric codes give ~2.2B combinations. Server-side generation with uniqueness retry is needed. Use `by_inviteCode` index for O(1) collision check.
- **testing.ts file size** — Already 2,833 lines. Adding ~300-400 lines of session test helpers is the established pattern. No technical limit — Convex registers all exports.
- **Middleware route protection** — `/workouts/session/[id]` is already protected by `/workouts(.*)` matcher. `/session/join/[inviteCode]` needs `/session(.*)` added to the matcher.

## Common Pitfalls

- **Subscription churn from heartbeats** — If `getSessionSets` reads from `sessionParticipants` to get `workoutId`s, it subscribes to that table and refires on every heartbeat. **Mitigation:** Query `workouts` table directly with `by_sessionId` index. This requires adding `sessionId` field to workouts and an index — but decouples set feed reactivity from presence updates entirely.

- **Double participant creation on React strict mode** — React 18+ strict mode double-invokes effects. If the session join page uses `useEffect` to call `joinSession`, it may create two participant entries. **Mitigation:** Use `useRef` guard identical to `ActiveWorkout.tsx` (D022). Also make `joinSession` mutation idempotent — check `by_sessionId_userId` index before inserting.

- **Invite code collision** — 6-char codes have low but non-zero collision probability. **Mitigation:** Generate code, query `by_inviteCode` index, retry if exists. Max 3 retries with increasing code length is overkill — collision at current scale is astronomically unlikely.

- **Stale presence after cron lag** — If the cron runs every 30 seconds and heartbeat is every 10 seconds, a participant who disconnects may show as "active" for up to 40 seconds (missed heartbeat at T=0, cron runs at T=30, marks idle). **Mitigation:** This is by design (D139). Client can also derive presence locally: `lastHeartbeatAt > Date.now() - 30000` in the UI for snappier display, while the cron handles the authoritative transition.

- **Orphaned workouts on session leave** — If a participant leaves a session, their `workouts` row with `sessionId` remains. **Mitigation:** `leaveSession` should call a non-fatal cleanup that either disassociates the workout (clear `sessionId`) or deletes it if no sets were logged. For S01, mark the participant as "left" but keep the workout — it's still their personal workout record.

- **Host disconnection** — If the host's heartbeat stops, the session has no host. **Mitigation:** S01 doesn't need to handle this — S02 adds session timeout (15-min no-heartbeat auto-complete per D141). For S01, the session stays in current state until the host returns or S02 timeout handles it.

- **workouts.by_sessionId index for set feed** — The `workouts` table currently has no `sessionId` field or index. Adding `sessionId: v.optional(v.id("groupSessions"))` is additive (existing rows have `undefined`). The new `by_sessionId` index is needed for `getSessionSets` to efficiently find all participant workouts. Without it, the query would need to iterate `sessionParticipants` → get each `workoutId` → fetch workout, which couples the set feed to the participants table.

## Open Risks

- **Heartbeat write cost at 10-participant sessions** — 10 participants × heartbeat every 10 seconds = 60 mutations/minute. Convex handles this easily for a single session. At 50+ concurrent sessions (3000+ heartbeat mutations/min), this may become a concern. **Acceptable for current scale.** Monitoring: check Convex dashboard for function call volume after deployment.

- **Participant list re-render on every heartbeat** — `getSessionParticipants` subscribes to `sessionParticipants` table. With 10 participants each sending heartbeats every 10 seconds, this query refires ~6 times/minute per participant viewer. The query returns ~10 lightweight participant documents — recomputation cost is negligible. React will diff and only update changed presence indicators. **Low risk but worth monitoring for visual flicker.**

- **Session set feed query cost** — `getSessionSets` traverses `workouts (by_sessionId) → workoutExercises (by_workoutId) → sets (by_workoutExerciseId)` for all participants. For 10 participants × 10 exercises × 5 sets = 500 document reads. This runs on every set log by any participant. Within Convex query limits but on the heavier side. **Mitigation:** Return summary data (exercise name, set count, latest set) rather than full set detail. Individual participant detail via separate query if needed.

- **Invite code human-readability** — 6-char alphanumeric codes may contain confusing characters (0/O, 1/l/I). **Mitigation:** Use a reduced character set excluding ambiguous characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars, ~1.07B combinations). Still plenty of entropy.

- **React concurrent mode and heartbeat intervals** — `setInterval` in a `useEffect` for heartbeat sending may have stale closure issues. **Mitigation:** Use `useRef` for the interval ID and `useCallback` for the heartbeat mutation call. Same pattern as `RestTimerContext.tsx` interval management.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` (4.6K installs) | available — most relevant general skill |
| Convex Realtime | `waynesutton/convexskills@convex-realtime` (1.3K installs) | available — directly relevant to presence subscriptions |
| Convex Cron Jobs | `waynesutton/convexskills@convex-cron-jobs` (1.2K installs) | available — relevant to presence cleanup cron |
| Convex Best Practices | `waynesutton/convexskills@convex-best-practices` (2K installs) | available — mutation pattern guidance |
| Convex Functions | `waynesutton/convexskills@convex-functions` (1.5K installs) | available — internal mutation patterns |
| Convex Schema | `waynesutton/convexskills@convex-schema-validator` (1.4K installs) | available — schema design patterns |

All skills are from the same author (`waynesutton`). The general `convex` skill (4.6K) and `convex-realtime` (1.3K) are the most directly relevant. Install commands:
- `npx skills add waynesutton/convexskills@convex`
- `npx skills add waynesutton/convexskills@convex-realtime`

## Sources

- Convex `crons.interval` supports multiple cron jobs in a single `crons.ts` file with different intervals (source: [Convex Scheduling Docs](https://docs.convex.dev/scheduling/cron-jobs))
- `useQuery` creates an automatic subscription that refires whenever the query's underlying data changes — this is the mechanism for realtime presence and set feed (source: [Convex React Client Docs](https://docs.convex.dev/client/react))
- `internalMutation` is the correct function type for cron-triggered presence cleanup — not exposed to client API (source: [Convex Server API](https://docs.convex.dev/generated-api/server))
- `ctx.scheduler.runAfter` and `ctx.scheduler.runAt` for scheduled functions — proven in challenges.ts (source: [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions))
- Convex `Date.now()` is frozen at mutation start — deterministic timestamps for heartbeat writes (source: [Convex Runtimes](https://docs.convex.dev/functions/runtimes))
- Challenges lifecycle pattern (pending → active → completed → cancelled) with idempotent guards is the structural template for session lifecycle (source: existing `challenges.ts` in codebase)
- Multi-user test helpers with `testUserId` bypass pattern scales to 3+ concurrent test users (source: existing `testing.ts` — 2,833 lines, used across M001-M004 verify scripts)
- The `by_sessionId` index on the `workouts` table is critical for decoupling the set feed query from the participants table (source: architectural analysis of subscription dependencies)
