# S01: Session Creation, Joining, Presence & Live Set Feed — UAT

**Milestone:** M005
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend contract is proven by compilation and verification script structure (12 checks). Web UI compilation is proven by tsc. Full live-runtime verification requires two authenticated browser windows on a live Convex backend — the artifact-driven checks prove correctness at the type/contract level while the live-runtime checks prove realtime behavior.

## Preconditions

- Convex dev server running (`npx convex dev` in packages/backend)
- Web app running (`pnpm -C apps/web dev`)
- Two browser windows/tabs logged in with different Clerk accounts
- At least one exercise exists in the library (for set logging)

## Smoke Test

Navigate to the web app as an authenticated user. Open browser console. Execute `fetch('/api/health')` or navigate to any protected route — verify you're authenticated. Manually create a session (via Convex dashboard or test helper) and navigate to `/workouts/session/[sessionId]` — verify the session page renders with `data-session-page` attribute, participant list, and empty set feed.

## Test Cases

### 1. Session Creation

1. Call `testCreateSession` via Convex dashboard or navigate to a UI entry point that creates a session
2. Verify the response includes a `sessionId` and 6-character `inviteCode`
3. Navigate to `/workouts/session/[sessionId]`
4. **Expected:** Page renders showing session status "Waiting", your name in the participant list with a green presence dot, an invite code/link displayed, and an empty set feed. `data-session-page` attribute present on container.

### 2. Join Session via Invite Link

1. In Browser B (different user), navigate to `/session/join/[inviteCode]`
2. Verify the join page shows session info (host name, participant count)
3. Click "Join Session"
4. **Expected:** User B is redirected to `/workouts/session/[sessionId]`. Both Browser A and Browser B now show 2 participants in the participant list. Session status is "Active" (transitioned from "Waiting"). `data-session-invite` attribute present on join page.

### 3. Presence Indicators — Active

1. Both browsers are on the session page
2. Wait 10+ seconds to let heartbeats fire
3. **Expected:** Both participants show green presence dots (`data-presence-indicator` with `bg-green-500` class). Last heartbeat timestamps are within the last 30 seconds.

### 4. Live Set Feed — Realtime Delivery

1. In Browser A, navigate to an active workout and log a set for any exercise
2. Return to the session page (or stay if sets can be logged inline)
3. **Expected:** Browser B sees the set appear in the session set feed (`data-session-sets`) within ~2 seconds. Set shows exercise name, weight × reps, and participant name badge in color.

### 5. Both Users' Sets in Feed

1. In Browser B, log a set for the same or different exercise
2. **Expected:** Both Browser A and Browser B see sets from both users in the session set feed, grouped by exercise. Each participant's sets have a distinctly colored name badge.

### 6. Presence — Idle Detection

1. In Browser A, close the tab (stop heartbeats)
2. Wait 40 seconds (10s heartbeat interval + 30s cron cleanup)
3. **Expected:** Browser B shows User A's presence dot as yellow (`bg-yellow-500`, idle status). `cleanupPresence` cron log shows "marked 1 participants idle".

### 7. Leave Session

1. In Browser B, trigger `leaveSession` (via UI button or test helper)
2. **Expected:** Browser B's participant status changes to "left" (gray dot, `bg-gray-400`). Participant remains in the list but marked as left.

### 8. Idempotent Join

1. Try to join the same session again as User B (via invite link or `joinSession`)
2. **Expected:** No error thrown. Participant count does not increase. Join is silently idempotent.

### 9. Participant Cap

1. Create a session and add 10 participants (via test helpers or manual joins)
2. Attempt an 11th join
3. **Expected:** Error thrown: "Session full (max 10 participants)". 11th user is rejected.

## Edge Cases

### Unauthenticated Access to Join Page

1. Open an incognito/private browser window
2. Navigate to `/session/join/[inviteCode]`
3. **Expected:** Redirected to Clerk sign-in page with redirect_url containing the session join path.

### Invalid Invite Code

1. Navigate to `/session/join/XXXXXX` (non-existent invite code)
2. **Expected:** Join page shows "Session not found" error state, not a crash or blank page.

### Host Cannot Leave

1. As the session host, trigger `leaveSession`
2. **Expected:** Error thrown: "Host cannot leave session". Host remains as participant.

### Session Page — Not Found

1. Navigate to `/workouts/session/nonexistent-id`
2. **Expected:** Session page shows a "Session not found" state with option to create a new session. No crash.

### Heartbeat Stops on Unmount

1. Navigate away from the session page
2. Check browser console
3. **Expected:** Console shows "[Session] Heartbeat stopped: unmount". No ongoing interval continues after leaving the page.

## Failure Signals

- Session page shows blank/loading state indefinitely — indicates query failure or missing session data
- Presence dots not updating — indicates heartbeat interval not firing or cron not running
- Set feed empty despite logged sets — indicates `getSessionSets` query not reading workouts.by_sessionId correctly
- Join page crashes on join — indicates `joinSession` mutation error or missing useRef guard
- Middleware not protecting `/session/*` — indicates regex pattern not added to matcher
- TypeScript compilation errors in any package — indicates schema or API type regression

## Requirements Proved By This UAT

- **R021** (partial) — This UAT proves session creation, joining, presence heartbeat with idle detection, and live set feed across multiple participants. It proves the heartbeat-based presence pattern (the primary risk identified in the milestone roadmap) works within acceptable latency.

## Not Proven By This UAT

- **R021 timer sync** — Shared rest timer not implemented until S02
- **R021 session lifecycle** — End session, cancel session, combined summary not implemented until S02
- **R021 session timeout** — Auto-completion of abandoned sessions not implemented until S02
- **R021 finishWorkout integration** — Session participant workout records flowing into feed/leaderboard/challenge/badge hooks not verified until S03
- **R021 mobile** — Mobile screens (GroupSessionScreen, SessionLobbyScreen, JoinSessionScreen) not implemented until S04
- **Live verification script execution** — 12 checks in verify-s01-m05.ts pending `npx convex login` authentication

## Notes for Tester

- The session creation entry point is not yet wired into the main workout UI — you'll need to create sessions via Convex dashboard test helpers or direct API calls for now.
- Heartbeat fires every 10 seconds and cron runs every 30 seconds — worst-case presence detection is ~40 seconds. Be patient when testing idle detection.
- The session page currently has no timer or "End Session" button — those come in S02.
- Weight display in the set feed respects the user's unit preference (kg/lbs).
- If the Convex dev server hasn't been started, `_generated/api.d.ts` may be overwritten on first run — verify sessions module is still registered.
- Pre-existing native TS2307 errors (38 convex/react) are expected and not related to S01 changes.
