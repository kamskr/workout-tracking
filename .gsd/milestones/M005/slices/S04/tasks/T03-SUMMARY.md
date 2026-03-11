---
id: T03
parent: S04
milestone: M005
provides:
  - GroupSessionScreen with full session lifecycle — heartbeat, status-driven rendering, host controls, clipboard invite code, all 4 session components composed
key_files:
  - apps/native/src/screens/GroupSessionScreen.tsx
key_decisions:
  - Used NativeStackScreenProps pattern (consistent with JoinSessionScreen/T01) instead of useRoute/useNavigation hooks — provides typed navigation+route as props
  - Invite code copy uses expo-clipboard Clipboard.setStringAsync (not full URL like web — mobile users share just the code)
  - End session confirmation uses Alert.alert with destructive-style button (native iOS/Android dialog pattern)
  - Heartbeat error handler uses console.error (not console.log) for mutation failures to distinguish from normal lifecycle logs
patterns_established:
  - Session screen lifecycle pattern — heartbeat useEffect with useRef for interval and sessionId, stops on completed status or mutation error, cleanup on unmount
  - Status-driven rendering with 4 paths — loading (ActivityIndicator), not-found (error with back button), completed (summary), waiting/active (live view with timer + participants + feed)
  - Host-only controls gated by user.id === session.hostId with Alert.alert confirmation before destructive action
observability_surfaces:
  - "console.log('[Session] Heartbeat started')" on heartbeat initialization
  - "console.log('[Session] Heartbeat stopped: unmount')" on cleanup
  - "console.error('[Session] Heartbeat stopped: mutation error', err)" on heartbeat failure
  - "console.log('[Session] End session requested')" before end mutation
  - "console.error('[Session] End session failed:', err)" on end failure + Alert.alert to user
  - "console.log('[Session] Invite code copied')" on clipboard success
  - "console.error('[Session] Invite code copy failed:', err)" on clipboard failure
  - Status badge renders Waiting/Active/Completed for visual session state inspection
duration: 12min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build GroupSessionScreen — full session lifecycle with heartbeat, timer, and summary

**Replaced T01 placeholder with full GroupSessionScreen implementing heartbeat lifecycle, status-driven rendering (loading/not-found/completed/live), host-only end session with Alert.alert confirmation, expo-clipboard invite code copy, and composition of all 4 T02 session components.**

## What Happened

Rewrote `GroupSessionScreen.tsx` from its ~40-line placeholder to a full ~350-line session lifecycle screen. The implementation mirrors the web session page (`apps/web/src/app/workouts/session/[id]/page.tsx`) with React Native equivalents:

1. **Route params & auth**: Accepts `{ sessionId: string }` via typed `NativeStackScreenProps`, imports `useUser` from `@clerk/clerk-expo` for host detection.

2. **Heartbeat lifecycle**: `useEffect` + `setInterval(10_000)` with `useRef` for both the interval handle and sessionId (avoids stale closures). Sends heartbeat immediately on mount, then every 10s. Stops automatically when session status is "completed", on mutation error (clears interval + logs), and on unmount (cleanup).

3. **Status-driven rendering**: Four render paths — loading (centered ActivityIndicator), not-found (icon + message + back button), completed (header card + SessionSummaryNative), and waiting/active (header card with invite code + SharedTimerDisplayNative + SessionParticipantListNative + SessionSetFeedNative in ScrollView).

4. **Host-only controls**: "End Session" button visible only when `user.id === session.hostId` and status !== "completed". Uses `Alert.alert` with Cancel/End (destructive) confirmation. Loading state during mutation. Errors shown via Alert + console.error.

5. **Invite code copy**: Uses `expo-clipboard` (`Clipboard.setStringAsync`) with "Copied!" flash state (2s timeout). Copies just the invite code (not a full URL, since mobile users share codes).

## Verification

All task-level and slice-level checks pass:

- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2307" | wc -l` → **0**
- `grep "10_000" GroupSessionScreen.tsx` → confirms heartbeat interval constant
- `grep "useRef" GroupSessionScreen.tsx` → confirms `intervalRef` and `sessionIdRef` patterns
- All 4 component imports confirmed: `SessionParticipantListNative`, `SessionSetFeedNative`, `SharedTimerDisplayNative`, `SessionSummaryNative`
- `grep "Clipboard" GroupSessionScreen.tsx` → confirms `expo-clipboard` import and `setStringAsync` usage
- `grep "Alert.alert" GroupSessionScreen.tsx` → confirms end session confirmation dialog
- No "placeholder" or "TODO" text (only `textPlaceholder` color references)
- All 6 slice files exist
- Backend tsc: 0 errors, Web tsc: 0 errors (no regressions)
- MainTabs exports `WorkoutsStackParamList`, registers both GroupSession and JoinSession screens
- WorkoutsScreen has both "Start Group Session" and "Join Session" buttons

## Diagnostics

- **Heartbeat lifecycle**: Fully logged — `[Session] Heartbeat started`, `[Session] Heartbeat stopped: unmount`, `[Session] Heartbeat stopped: mutation error`. Inspect via device console logs or React Native debugger.
- **Session state**: Visible via status badge (Waiting/Active/Completed) rendered in header card. Query result from `getSession` drives all rendering.
- **End session errors**: Surfaced to user via `Alert.alert("Error", ...)` and logged via `console.error("[Session] End session failed: ...")`.
- **Invite code**: Copy success/failure logged to console.
- **Not-found state**: Clear error message with back button when session is null.

## Deviations

- Used `NativeStackScreenProps` (existing codebase pattern from T01) instead of `useRoute<RouteProp<...>>()` as specified in the plan. Both provide typed access to `route.params.sessionId`; the props approach is consistent with JoinSessionScreen and other screens in the codebase.
- Copies invite code only (not full URL) since mobile users share codes directly, not URLs.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/screens/GroupSessionScreen.tsx` — Rewritten: full session lifecycle screen (~350 lines) replacing T01 placeholder, with heartbeat, status-driven rendering, host controls, clipboard copy, and all 4 session component compositions
