---
estimated_steps: 5
estimated_files: 5
---

# T03: Web UI — session page, join page, middleware, and heartbeat

**Slice:** S01 — Session Creation, Joining, Presence & Live Set Feed
**Milestone:** M005

## Description

Build the complete web frontend for group sessions: the live session page at `/workouts/session/[id]` with participant list, shared set feed, and heartbeat; the join page at `/session/join/[inviteCode]` with auth-gated join flow; and the middleware update. This makes the feature visually verifiable with two browser windows.

## Steps

1. **Update middleware** — Add `/session(.*)` to the `isProtectedRoute` matcher in `apps/web/src/middleware.ts`. This protects the join route `/session/join/[inviteCode]` (the session view at `/workouts/session/[id]` is already covered by `/workouts(.*)`).

2. **Create `SessionParticipantList` component** — `apps/web/src/components/session/SessionParticipantList.tsx`. Takes `sessionId` prop, calls `useQuery(api.sessions.getSessionParticipants, { sessionId })`. Renders a vertical list of participant cards: avatar (via Avatar component from common/), display name, and a colored presence dot (green circle for "active", yellow for "idle", gray for "left"). Add `data-session-participants` on the container and `data-presence-indicator` on each participant's presence dot. Show participant count header.

3. **Create `SessionSetFeed` component** — `apps/web/src/components/session/SessionSetFeed.tsx`. Takes `sessionId` prop, calls `useQuery(api.sessions.getSessionSets, { sessionId })`. Renders all participants' sets in a chronological feed, grouped by exercise. Each set entry shows: participant name badge (colored), exercise name, set details (weight × reps, RPE if present). Use `displayWeight` from `@/lib/units` for unit conversion. Read-only display (no editing). Add `data-session-sets` on the container. Show empty state "No sets logged yet — start your workout!" when feed is empty. Format weight display respecting user's unit preference via `useQuery(api.userPreferences.getUserPreferences)`.

4. **Create join page** — `apps/web/src/app/session/join/[inviteCode]/page.tsx`. Uses `useParams()` to get invite code. Calls `useQuery(api.sessions.getSession, ...)` or a lookup-by-invite-code query to find the session. Shows session info (host name, participant count, status). "Join Session" button triggers `useMutation(api.sessions.joinSession)`. Uses `useRef` guard (D022 pattern) to prevent double-join in React strict mode. On success, redirects to `/workouts/session/[sessionId]` via `useRouter().push()`. Shows loading/error/already-joined states. `data-session-invite` attribute on the page container.

5. **Create session page** — `apps/web/src/app/workouts/session/[id]/page.tsx`. Three queries with "skip" pattern (D085): `useQuery(api.sessions.getSession, sessionId ? { sessionId } : "skip")`, participant list and set feed as separate components receiving sessionId. Layout: header with session status + invite code copy button + participant count, left sidebar (or top section) with `SessionParticipantList`, main area with `SessionSetFeed`. Heartbeat: `useEffect` with `setInterval` every 10 seconds calling `sendHeartbeat` mutation. Use `useRef` for interval ID and `useCallback` for heartbeat function to avoid stale closures. Cleanup on unmount. Shows "Create Session" button if accessed without existing session (calls `createSession`, then navigates to the created session). Invite link section: displays `/session/join/[inviteCode]` URL with copy-to-clipboard button. `data-session-page` attribute on container.

## Must-Haves

- [ ] `/session(.*)` added to middleware protected routes
- [ ] Join page: fetches session by invite code, join button with useRef guard, redirect on success
- [ ] Session page: three separate queries (getSession, getSessionParticipants via component, getSessionSets via component)
- [ ] Heartbeat: useEffect + setInterval every 10s calling sendHeartbeat, cleanup on unmount
- [ ] SessionParticipantList: presence dots (green/yellow/gray), data-session-participants, data-presence-indicator
- [ ] SessionSetFeed: all participants' sets displayed, grouped by exercise, read-only, data-session-sets
- [ ] Invite link copyable to clipboard
- [ ] Loading/error states on both pages
- [ ] `data-session-page`, `data-session-invite` attributes
- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors

## Verification

- `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors
- Middleware: `/session/join/xyz` redirects to Clerk sign-in when not authenticated
- Browser: navigating to `/workouts/session/[id]` renders participant list and set feed
- Browser: invite link copy button works
- Manual: two browser windows on same session URL show realtime participant and set updates

## Observability Impact

- Signals added/changed: Client-side heartbeat interval logs to browser console on start/stop. Join page logs join success/failure.
- How a future agent inspects this: `data-session-page`, `data-session-participants`, `data-session-sets`, `data-session-invite`, `data-presence-indicator` attributes are queryable via `document.querySelectorAll()` in browser automation.
- Failure state exposed: Join page shows error message from mutation rejection. Session page shows loading spinner while queries resolve, error state if session not found.

## Inputs

- `packages/backend/convex/sessions.ts` — T01's session API (createSession, joinSession, sendHeartbeat, getSession, getSessionParticipants, getSessionSets)
- `apps/web/src/middleware.ts` — existing Clerk middleware to extend
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — useRef guard pattern (D022) for join page
- `apps/web/src/components/feed/FeedItem.tsx` — avatar + name + relative time display pattern for participant cards
- `apps/web/src/app/shared/[id]/page.tsx` — loading/error/data state pattern for join page
- `apps/web/src/lib/units.ts` — displayWeight/formatWeight for set display

## Expected Output

- `apps/web/src/middleware.ts` — updated with `/session(.*)` in protected routes
- `apps/web/src/app/workouts/session/[id]/page.tsx` — new file, ~200-250 lines, live session view
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — new file, ~150-200 lines, join flow
- `apps/web/src/components/session/SessionParticipantList.tsx` — new file, ~80-100 lines
- `apps/web/src/components/session/SessionSetFeed.tsx` — new file, ~120-150 lines
