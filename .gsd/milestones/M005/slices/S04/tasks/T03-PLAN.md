---
estimated_steps: 5
estimated_files: 1
---

# T03: Build GroupSessionScreen — full session lifecycle with heartbeat, timer, and summary

**Slice:** S04 — Mobile Port
**Milestone:** M005

## Description

Replace the T01 placeholder GroupSessionScreen with the full implementation — the primary mobile session view that orchestrates all 4 session components (T02), manages the heartbeat lifecycle, handles host-only actions, and renders conditionally based on session status. This is the mobile equivalent of `apps/web/src/app/workouts/session/[id]/page.tsx`.

## Steps

1. **Set up screen structure and route params** — Accept `{ sessionId: string }` from `WorkoutsStackParamList` via `useRoute<RouteProp<WorkoutsStackParamList, "GroupSession">>()`. Import `useUser()` from `@clerk/clerk-expo` for host detection. Import all 4 session components. Set up `useQuery(api.sessions.getSession, { sessionId })` with skip pattern. Add back navigation header with `navigation.goBack()`.

2. **Implement heartbeat lifecycle** — `useEffect` + `setInterval(10_000)` + `useRef(intervalRef)`. Send heartbeat immediately on mount, then every 10s. Stop heartbeat when session status is "completed". Stop heartbeat on interval mutation error (clear interval + log). Cleanup: `clearInterval` on unmount. Log `[Session] Heartbeat started` and `[Session] Heartbeat stopped: unmount/error`. Ref pattern mirrors web session page exactly. Use `useRef` for sessionId to avoid stale closure.

3. **Build status-driven rendering** — Four render paths: (a) Loading: `session === undefined` → SafeAreaView with centered ActivityIndicator. (b) Not found: `session === null` → error message with back button. (c) Completed: `session.status === "completed"` → header card (status badge, host name, participant count) + `SessionSummaryNative`. (d) Waiting/Active: full live view — header card with invite code display + copy button (expo-clipboard `Clipboard.setStringAsync`, "Copied!" flash state), `SharedTimerDisplayNative`, vertical layout with `SessionParticipantListNative` then `SessionSetFeedNative` in a `ScrollView`.

4. **Implement host-only controls** — "End Session" button visible only when `user?.id === session.hostId && session.status !== "completed"`. On press: `Alert.alert("End Session?", "...", [Cancel, { text: "End", style: "destructive", onPress: endSession }])`. Loading state during mutation. `endSessionMutation({ sessionId })` call. Log `[Session] End session requested/failed`.

5. **Verify compilation and patterns** — Run `tsc --noEmit` on native. Confirm GroupSessionScreen.tsx contains: heartbeat setInterval with 10_000, useRef for intervalRef, all 4 component imports, useUser import, Clipboard import, Alert.alert for end session confirmation. Confirm no placeholder code remains.

## Must-Haves

- [ ] Route params `{ sessionId: string }` consumed via typed `useRoute`
- [ ] Heartbeat: `setInterval(10_000)` with immediate first beat, `useRef` for interval, cleanup on unmount
- [ ] Heartbeat stops on mutation error (clearInterval + console.error)
- [ ] Heartbeat stops for completed sessions (conditional in useEffect)
- [ ] Host detection: `useUser().user.id === session.hostId`
- [ ] Status-driven rendering: loading, not-found, completed (summary), waiting/active (live view)
- [ ] Invite code display with clipboard copy via `expo-clipboard` + "Copied!" feedback
- [ ] Host-only "End Session" button with `Alert.alert` confirmation
- [ ] All 4 session components composed: SharedTimerDisplayNative, SessionParticipantListNative, SessionSetFeedNative, SessionSummaryNative
- [ ] Back navigation header
- [ ] Status badge showing Waiting/Active/Completed

## Verification

- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2307" | wc -l` returns 0
- `grep "setInterval.*10.000\|10_000" apps/native/src/screens/GroupSessionScreen.tsx` confirms heartbeat interval
- `grep "useRef" apps/native/src/screens/GroupSessionScreen.tsx` confirms interval ref pattern
- `grep "SessionParticipantListNative\|SessionSetFeedNative\|SharedTimerDisplayNative\|SessionSummaryNative" apps/native/src/screens/GroupSessionScreen.tsx` confirms all 4 component imports
- `grep "Clipboard" apps/native/src/screens/GroupSessionScreen.tsx` confirms expo-clipboard usage
- `grep "Alert.alert" apps/native/src/screens/GroupSessionScreen.tsx` confirms end session confirmation
- GroupSessionScreen.tsx has no "placeholder" or "TODO" text

## Observability Impact

- Signals added/changed: `console.log("[Session] Heartbeat started")`, `console.log("[Session] Heartbeat stopped: unmount")`, `console.log("[Session] Heartbeat stopped: mutation error")`, `console.log("[Session] End session requested")`, `console.error("[Session] End session failed: ...")`, invite code copy success/failure
- How a future agent inspects this: Heartbeat lifecycle is fully logged. Session state visible via status badge rendering. End session errors surfaced via Alert. All signals match web session page patterns for cross-platform consistency.
- Failure state exposed: Heartbeat mutation errors stop the interval and log the cause. End session errors shown via Alert + console.error. Session not-found state renders clear error message.

## Inputs

- `apps/native/src/screens/GroupSessionScreen.tsx` — T01 placeholder to replace
- `apps/web/src/app/workouts/session/[id]/page.tsx` — Web session page source (365 lines) for port reference
- `apps/native/src/components/session/SessionParticipantListNative.tsx` — T02 output, accepts `sessionId` prop
- `apps/native/src/components/session/SessionSetFeedNative.tsx` — T02 output, accepts `sessionId` prop
- `apps/native/src/components/session/SharedTimerDisplayNative.tsx` — T02 output, accepts `session` + `sessionId` props
- `apps/native/src/components/session/SessionSummaryNative.tsx` — T02 output, accepts `sessionId` prop
- `apps/native/src/navigation/MainTabs.tsx` — T01 output, `WorkoutsStackParamList` type for typed route params
- S01 forward intelligence: three-query architecture (getSession is the main query, child components own their own)

## Expected Output

- `apps/native/src/screens/GroupSessionScreen.tsx` — Rewritten: ~350 lines, full session lifecycle screen replacing T01 placeholder
