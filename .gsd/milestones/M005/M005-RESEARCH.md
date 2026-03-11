# M005: Collaborative Live Workouts — Research

**Date:** 2026-03-11

## Summary

Collaborative live workouts is a multiplayer realtime feature layered on top of the existing single-player workout system. The core engineering challenge is not "can Convex do realtime" (it already does — every `useQuery` is a live subscription), but rather designing a **session state machine**, a **heartbeat-based presence system**, and a **server-authoritative shared timer** that all survive concurrent multi-user mutations without race conditions or clock drift.

The existing codebase provides strong foundations. The workout model (workouts → workoutExercises → sets) can be reused per-participant within a group session. The challenge lifecycle state machine (pending → active → completed → cancelled) is a direct template for session lifecycle. The rest timer context (RestTimerContext.tsx) is the client-side pattern to extend for server-authoritative shared timers. The non-fatal hook pattern in `finishWorkout` is the model for session completion side effects. The 2,800-line `testing.ts` with explicit `testUserId` args is the exact test infrastructure pattern for multi-user verification scripts.

**Primary recommendation:** Prove the presence heartbeat and shared timer synchronization first — these are the novel technical patterns with no prior art in the codebase. Build session creation and set broadcasting second (relatively straightforward Convex mutations + queries). Port to mobile last, following the established D050/D077/D113 web-first convention. The entire feature can be built with 3 new Convex tables, 1 new Convex module, 1 cron addition, and 2-3 new web pages, plus mobile screens.

## Recommendation

**Slice ordering: Session data model + presence → Set broadcasting + shared timer → Session lifecycle + summary → Mobile port.**

Session + presence first because it's the highest-risk novel pattern. If presence heartbeats create unacceptable write load or if timer sync drifts beyond 1 second, the feature design may need to change before building the full UI. Set broadcasting and shared timer second because they depend on the session model and are the core user-visible value. Session lifecycle (completion, summary) third because it wraps up the backend. Mobile port last per established convention.

This ordering front-loads the two biggest risks (presence write load, timer synchronization) into the first slice where the cost of pivoting is lowest.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Realtime data sync | Convex reactive queries (`useQuery`) | Already powers the entire app — every session participant subscribing to session data gets live updates automatically |
| Session state machine | Challenges lifecycle pattern (`pending → active → completed → cancelled`) | Proven pattern in `challenges.ts` with cron + scheduler. Session lifecycle is structurally identical. |
| Presence heartbeat expiry | Convex cron interval (`crons.interval`) | Already running a 15-min challenge deadline cron. Add a 30-second presence cleanup cron alongside it. |
| Server-authoritative timer | Convex `Date.now()` in mutation (frozen at function start per runtime docs) | Deterministic timestamps. Timer state stored in DB, clients compute remaining from `timerEndAt - serverTimestamp`. Same wall-clock pattern as `RestTimerContext` (D032). |
| Multi-user test infrastructure | `testing.ts` pattern with `testUserId` args | 2,800 lines of proven test helpers. Extend with `testCreateSession`, `testJoinSession`, `testHeartbeat`, etc. |
| Invite links | Existing `/shared/[id]` public route pattern | D075 established public Convex queries + Clerk middleware exclusion. Session join link can follow the same pattern. |
| Session completion hooks | `finishWorkout` non-fatal hook pattern | 4 hooks already proven (feed item, leaderboard, challenge, badge). Session summary creation follows the same try/catch non-fatal pattern. |

## Existing Code and Patterns

### Backend — Direct Reuse

- `packages/backend/convex/schema.ts` — 21-table normalized schema. New tables (groupSessions, sessionParticipants, sessionHeartbeats or presence field) follow the same `defineTable` + index pattern. The `workoutStatus` validator and composite indexes are the structural template.
- `packages/backend/convex/challenges.ts` — **Primary template for session lifecycle.** State machine (pending → active → completed → cancelled), cron-based deadline check (`checkDeadlines`), participant join/leave with cap, creator privileges, `ctx.scheduler.runAt` for precise lifecycle transitions. Session lifecycle is structurally identical.
- `packages/backend/convex/lib/challengeCompute.ts` — Template for session-scoped computation helpers. Factored as a pure function accepting `db` + IDs, called from mutations. Session presence cleanup and summary computation should follow the same pattern.
- `packages/backend/convex/workouts.ts` — `finishWorkout` mutation with 4 non-fatal hooks is the pattern for session completion (create summary, update individual workout records, etc.). `createWorkout` and `getActiveWorkout` are the per-participant workout creation patterns.
- `packages/backend/convex/crons.ts` — Single cron file with one interval job. Will add a second interval for presence cleanup (e.g., every 30 seconds).
- `packages/backend/convex/testing.ts` — 2,833 lines of multi-user test helpers with explicit `testUserId` args bypassing Clerk auth. Pattern scales directly to session test helpers (`testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testLogSetInSession`, etc.).
- `packages/backend/convex/lib/auth.ts` — `getUserId(ctx)` pattern used in all auth-gated functions. Session mutations follow the same pattern.

### Frontend — Direct Reuse

- `apps/web/src/components/workouts/RestTimerContext.tsx` — Client-side timer state machine (idle → running → paused → completed). The shared timer will use the same `Date.now()` arithmetic pattern (D032) but sourced from server state instead of local state. The context provider pattern wraps session pages.
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — SVG circular countdown. Can be reused or minimally adapted for the shared timer display.
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — Workout creation flow with `useRef` guard against double-creation (D022). Session join flow needs the same pattern.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` + `SetRow.tsx` — Set logging UI. In a group session, each participant logs sets through the same UI, but the display shows all participants' sets.
- `apps/web/src/components/feed/FeedItem.tsx` + `ReactionBar.tsx` — Social display pattern. Session participant list + presence indicators follow similar component patterns.
- `apps/web/src/middleware.ts` — Clerk route protection with `/shared` exclusion. Session join links (e.g., `/session/join/[id]`) need the same exclusion pattern.
- `apps/native/src/navigation/MainTabs.tsx` — 7-tab navigator. Group workout likely lives within the existing Workouts tab stack, not as a new tab.
- `apps/native/src/components/social/FollowButtonNative.tsx` — Self-contained component with own query subscriptions. Presence indicator component should follow the same pattern.

### Patterns to Follow

- **Non-fatal hook pattern** — Session-related side effects (feed item creation, badge evaluation) wrapped in try/catch to never block the primary action.
- **Data attributes for testing** — `data-session-*`, `data-presence-*` attributes following D057/D064/D082/D090/D099/D118/D124/D130 convention.
- **Conditional query with "skip"** — `useQuery(api.fn, condition ? args : "skip")` per D085 for loading session data only when session ID is known.
- **Web-first, mobile port last** — D050/D077/D113 convention. Backend + web first in slices 1-3, mobile port in slice 4.
- **Separate module file** — New `sessions.ts` module (not adding to workouts.ts or social.ts) following D091/D095 convention of domain-specific modules.
- **Framework-agnostic lib files** — Shared session computation in `convex/lib/sessionCompute.ts` following D063/D128 pattern.

### Patterns to Avoid

- **Timer state in client only** — D008 made individual rest timer local-only. Shared timer MUST be server-authoritative or it will drift between participants. This is a deliberate departure from D008.
- **Optimistic updates for shared state** — D092 used local optimistic state for reactions. For collaborative set display, optimistic updates are risky because multiple users are writing concurrently. Let Convex's reactive queries handle the sync; accept the ~100-500ms latency for set appearance.
- **Inline expansion for session detail** — D123 used inline expansion for challenge detail. Session management needs a dedicated route (`/workouts/session/[id]`) for deep linking and participant sharing.

## Constraints

- **Convex mutation transaction limit** — Mutations that read/write too many documents (16K reads) will fail. Heartbeat writes are single-document upserts (bounded). Session queries reading all participants' sets must be bounded — `.take(100)` per participant's sets is safe.
- **Convex `Date.now()` is frozen per mutation** — All timestamps within a single mutation are identical. This is fine for heartbeat writes but means timer start/stop within the same mutation share a timestamp (acceptable).
- **Convex 10-second query timeout** — Session queries joining sets across multiple participants must stay under 10s. For 10 participants × ~20 exercises × ~5 sets = ~1000 set reads, this is well within limits.
- **Cron interval minimum is 1 second** — Presence cleanup cron at 30-second intervals is safe. More frequent than the 15-minute challenge cron but well within Convex limits.
- **Schema migration** — Adding 2-3 new tables requires `npx convex dev` to push schema. No existing table modifications needed (workouts get an optional `sessionId` field at most).
- **Testing infrastructure** — `testing.ts` is already 2,833 lines. Session test helpers will add ~500-800 more lines. This is the established pattern but the file is getting large. Consider splitting into `testing-sessions.ts` (but Convex registers all exports in the module, so file size is a convention choice, not a technical limit).
- **7-tab mobile navigation** — D133 established 7 tabs as the ceiling. Group workout flows must nest within the existing Workouts tab stack, not add an 8th tab.

## Common Pitfalls

- **Presence heartbeat write amplification** — If 10 participants each write a heartbeat every 5 seconds, that's 120 writes/minute to the presence table. Convex handles this easily, but the reactive subscription on session participants will refire on every heartbeat write if presence data is embedded in the participant document. **Mitigation:** Store `lastHeartbeatAt` on the participant document (not a separate presence table). Queries that need presence can derive it from `lastHeartbeatAt > Date.now() - THRESHOLD`. The subscription refires on heartbeat writes, but participants already subscribe to session data that changes on every set log — heartbeats add marginal overhead. Alternatively, use a separate `sessionPresence` table that the main session query doesn't subscribe to, reducing subscription churn.

- **Timer drift between clients** — If each client runs its own `setInterval` from a server-stored `timerEndAt`, clocks can drift by 1-2 seconds. **Mitigation:** Use server `timerEndAt` timestamp as the source of truth. Client computes `remaining = timerEndAt - now` locally. When the timer is started, the mutation stores `timerEndAt = Date.now() + durationSeconds * 1000` in the session document. All clients subscribe to this document and compute their own countdown. Drift is bounded by NTP clock skew between client devices (typically <1 second). The existing `RestTimerContext` pattern (D032) already uses this wall-clock approach.

- **Race condition on session completion** — Multiple participants might try to "end session" simultaneously. **Mitigation:** Only the session creator (host) can end the session, or use idempotent completion mutation (same pattern as `completeChallenge` — check status before transitioning, return early if already completed).

- **Stale heartbeat on app background** — When a mobile app enters background, `setInterval` stops. Heartbeats stop arriving, and the user appears "idle" correctly. But when the app returns to foreground, the heartbeat resumes and presence recovers. **Mitigation:** This is actually the correct behavior. React Navigation's `useFocusEffect` or `AppState` listener can restart heartbeat on foreground return.

- **Session cleanup for abandoned sessions** — If the host disconnects and never returns, the session hangs in "active" state forever. **Mitigation:** Add a session timeout (e.g., no heartbeats from any participant for 15 minutes → auto-complete). Cron job checks for this alongside presence cleanup.

- **Per-participant workout records** — Each participant in a group session also needs their own individual workout record (for history, analytics, PRs, leaderboards). **Mitigation:** On session start, each participant gets a `workouts` row with a `sessionId` foreign key. Their set logging goes through the normal `logSet` path, which triggers PR detection, leaderboard updates, etc. The session view aggregates across all participants' workouts.

- **Invite link security** — Session join links must not be guessable. **Mitigation:** Use the session document's Convex `_id` as the token (same pattern as D097 for share tokens — Convex IDs are opaque/unguessable). Optional: add an `inviteCode` field with a random string for shorter URLs.

## Open Risks

- **Heartbeat write cost at scale** — 10 participants × heartbeat every 5 seconds = 120 mutations/minute per session. For a single active session this is negligible, but if the app grows to 100+ concurrent sessions, it's 12,000 mutations/minute from heartbeats alone. The context document says the feature is optimized for small groups (≤10) and the project is at early stage, so this risk is acceptable now. **Candidate decision:** Heartbeat frequency of 10 seconds (vs 5) halves write cost with acceptable 20-second worst-case presence detection delay (heartbeat interval + cron cleanup interval).

- **Convex subscription fan-out on session changes** — When participant A logs a set, the session query recomputes for ALL subscribed participants. If the session query is expensive (joins across workouts + sets for all participants), this could be slow. **Mitigation:** Design the session query to return lightweight data (set summaries, not full workout details). Individual participant detail can be a separate query scoped to one participant.

- **Mobile background heartbeat reliability** — iOS aggressively suspends background tasks. React Native `setInterval` stops in background. Expo's `expo-task-manager` can run background tasks but adds complexity. **Mitigation:** Accept that background = idle. Don't try to maintain presence in background — it's the correct semantic. User re-entering foreground restores presence within one heartbeat cycle.

- **Testing collaborative flows** — Automated testing of multi-client realtime interactions is hard. The `testing.ts` pattern with `testUserId` args allows simulating multiple users from a single script, but doesn't prove realtime subscription delivery. **Mitigation:** Backend verification scripts prove data correctness (set A logged by user 1 appears in session query for user 2). Realtime delivery is Convex platform responsibility. Manual multi-browser testing validates the UX.

- **Session-scoped timer conflicts** — If participant A starts a shared timer and participant B starts a different timer 2 seconds later, what happens? **Candidate decision:** Last-write-wins for shared timer start. Any participant can start/pause/skip the shared timer. The mutation unconditionally overwrites `timerEndAt`. This is simple and matches gym buddy behavior (either person hits the timer).

## Proposed Data Model

Based on research, the recommended schema addition:

```
groupSessions:
  hostId: string (creator)
  status: "waiting" | "active" | "completed" | "cancelled"
  inviteCode: string (6-char random, for short URLs)
  sharedTimerEndAt: optional number (server-authoritative timer)
  sharedTimerDurationSeconds: optional number
  createdAt: number
  completedAt: optional number
  indexes: by_hostId, by_inviteCode, by_status

sessionParticipants:
  sessionId: Id<"groupSessions">
  userId: string
  workoutId: Id<"workouts"> (each participant's individual workout)
  lastHeartbeatAt: number (presence — derived from periodic mutation)
  status: "active" | "idle" | "left"
  joinedAt: number
  indexes: by_sessionId, by_userId, by_sessionId_userId
```

This is 2 new tables. The existing `workouts` table gets an optional `sessionId: v.optional(v.id("groupSessions"))` field to link individual workouts to sessions. No existing table restructuring — just an additive optional field.

## Candidate Requirements (Advisory — Not Auto-Binding)

These emerged from research and should be evaluated during planning:

1. **Session host privileges** — Only the host can end or cancel a session. Other participants can only leave. (Mirrors challenge creator pattern from D125.)
2. **Late join support** — Users should be able to join an active session (not just "waiting" sessions). They see ongoing workout state mid-stream. (Context document lists this as an open question — recommend yes for usability.)
3. **Session timeout** — Auto-complete sessions with no heartbeats for 15+ minutes. Prevents abandoned sessions from lingering. (No existing equivalent — new requirement.)
4. **Participant limit enforcement** — Hard cap at 10 participants per session. (Mirrors D115's challenge participant cap of 100, but tighter for performance reasons stated in context.)
5. **Individual workout records** — Each participant's sets must be stored as normal workout records (not session-only) so they flow into analytics, PRs, leaderboards, and badges. (Table stakes — the non-fatal hooks in `finishWorkout` already handle this.)
6. **Session join via link (unauthenticated landing)** — The join link should work for unauthenticated users (show session preview, prompt sign-in). (Follows D075 public route pattern.)
7. **Shared timer last-write-wins** — Any participant can start/pause/skip the shared timer. No permission hierarchy for timer control. (Simplest UX for training partners.)

## Requirement Analysis (R021)

**R021 — Collaborative Live Workouts** is currently `active` and `unmapped`. The description covers:

- ✅ **Table stakes:** Start shared session, join via invite, see each other's sets in realtime, presence indicators — all explicitly stated and essential.
- ✅ **Table stakes:** Shared rest timer synchronized across participants — explicitly stated, server-authoritative implementation is the only viable approach.
- ⚠️ **Likely omission:** Individual workout records per participant — not mentioned in R021 but critical for continuity with M001-M004 systems (analytics, PRs, leaderboards, badges). Without this, group workouts are an island feature.
- ⚠️ **Likely omission:** Session timeout / abandoned session handling — not mentioned but necessary for operational completeness.
- ⚠️ **Overbuilt risk:** Combined session summary at completion — mentioned in acceptance criteria. The scope of "combined summary" is ambiguous. A simple "session complete" screen showing all participants' workout summaries is sufficient; building a dedicated analytics view for group sessions is overbuilt for M005.
- ✅ **Domain standard:** Invite via link sharing — standard collaborative UX pattern, aligns with existing share link infrastructure.

**Missing from R021 that should be considered:**
- **Host transfer** — What if the host leaves? Auto-promote or end session? (Recommend: auto-end for simplicity.)
- **Reconnection** — User's connection drops and reconnects. Convex handles WebSocket reconnection automatically — presence recovers on next heartbeat.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` (4.6K installs) | available — recommended if not already installed |
| Convex Realtime | `waynesutton/convexskills@convex-realtime` (109 installs) | available — directly relevant to presence + session sync |
| Convex Best Practices | `waynesutton/convexskills@convex-best-practices` (2K installs) | available — useful for mutation patterns |

**Note:** The `convex` skill (4.6K installs) is the most relevant. The `convex-realtime` skill is directly applicable but has low install count. Both are from the same author. User should decide whether to install.

## Sources

- Convex cron interval can clear presence data every 30 seconds — established pattern (source: [Convex Scheduling Docs](https://docs.convex.dev/scheduling/cron-jobs))
- `Date.now()` is frozen at mutation start — deterministic timestamps for timer storage (source: [Convex Runtimes Docs](https://docs.convex.dev/functions/runtimes))
- Convex reactive queries provide automatic real-time sync to all subscribers — no WebSocket layer needed (source: [Convex Client Docs](https://docs.convex.dev/client/react))
- Optimistic updates pattern available but not recommended for multi-user collaborative state due to reconciliation complexity (source: [Convex Optimistic Updates](https://docs.convex.dev/client/react/optimistic-updates))
- `ctx.scheduler.runAt` for precise session timeout scheduling — proven in challenge lifecycle (source: existing `challenges.ts` in codebase)
- Convex mutation 16K document read limit constrains session query design (source: [Convex Limits](https://docs.convex.dev))
- Challenge lifecycle state machine (pending → active → completed → cancelled) is the structural template for session lifecycle (source: existing `challenges.ts`, `crons.ts` in codebase)
- Non-fatal hook pattern in `finishWorkout` handles 4 side effects safely (source: existing `workouts.ts` in codebase)
- Public route pattern with Clerk middleware exclusion for unauthenticated access (source: existing `middleware.ts`, D075 in codebase)
