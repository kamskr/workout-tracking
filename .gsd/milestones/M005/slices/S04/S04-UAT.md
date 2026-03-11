# S04: Mobile Port — Group Session Screens — UAT

**Milestone:** M005
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: TypeScript compilation and structural pattern checks verify type safety, API bindings, and file structure (artifact-driven). Runtime behavior (heartbeat lifecycle, timer animation, Vibration haptics, navigation transitions, real Convex subscriptions) requires manual testing on a device/simulator (live-runtime). The artifact-driven checks are complete; runtime UAT requires Expo dev server + live Convex backend.

## Preconditions

- Expo development server running (`cd apps/native && npx expo start`)
- Live Convex backend deployed and authenticated (`npx convex dev` or production deployment)
- Clerk authentication configured for mobile (existing setup)
- Two test devices or simulators (or one device + web browser for cross-platform testing)
- At least one user account signed in on each device

## Smoke Test

1. Open the app on a device/simulator
2. Navigate to the Workouts tab
3. Verify "Start Group Session" and "Join Session" buttons are visible below the main "Start Workout" button
4. **Expected:** Both buttons render correctly with proper styling

## Test Cases

### 1. Create a Group Session

1. On Device A, tap "Start Group Session" on WorkoutsScreen
2. **Expected:** Navigates to GroupSessionScreen showing invite code, "Waiting" status badge, participant list with just the host, and no timer/set feed yet

### 2. Copy Invite Code

1. On GroupSessionScreen (Device A), tap the invite code area
2. **Expected:** "Copied!" feedback appears briefly. Paste in another app confirms the 6-char code was copied.

### 3. Join a Session via Invite Code

1. On Device B, tap "Join Session" on WorkoutsScreen
2. Enter the 6-char invite code from Device A (case-insensitive, auto-uppercase)
3. **Expected:** Session preview card appears showing host name, participant count, and status. After tapping "Join Session", navigates to GroupSessionScreen showing the same session with both participants listed.

### 4. Presence Indicators

1. With both devices on the GroupSessionScreen
2. **Expected:** Both participants show green presence dots (active). Close Device B's app for 30+ seconds.
3. **Expected:** Device A shows Device B's participant with yellow dot (idle). Reopen Device B.
4. **Expected:** Device B's dot returns to green (heartbeat re-activates).

### 5. Shared Timer

1. On either device, select a duration preset (30s/60s/90s/120s) and tap "Start Timer"
2. **Expected:** Both devices show the countdown timer with ProgressRing animation, synchronized within ~1 second.
3. Tap "Pause" on one device
4. **Expected:** Timer clears on both devices, returning to idle state with presets.
5. Start timer again and let it complete
6. **Expected:** Device vibrates (`Vibration.vibrate()`), "Done!" appears briefly, then timer returns to idle.

### 6. Live Set Feed

1. On Device A, navigate back, start a workout within the session, and log a set
2. **Expected:** Device B sees the set appear in the set feed (exercise name, weight, reps, participant badge with deterministic color)
3. Log another set on Device B
4. **Expected:** Device A sees it in their set feed, grouped by exercise

### 7. End Session (Host Only)

1. On Device A (host), tap "End Session"
2. **Expected:** Alert.alert confirmation dialog appears with "Cancel" and "End" buttons
3. Tap "End"
4. **Expected:** Both devices show the SessionSummaryNative view with "Session Complete!" header, participant stat cards (exercises, sets, volume, duration)

### 8. Non-Host Cannot End Session

1. During an active session, verify Device B does NOT see the "End Session" button
2. **Expected:** Only the host (Device A) sees the end session control

### 9. Invalid Invite Code

1. On JoinSessionScreen, enter "XXXXXX" (invalid code)
2. **Expected:** "Session not found" preview card appears. No join button or disabled join button.

### 10. Join Error Handling

1. Try to join a session that is already completed
2. **Expected:** Alert.alert with error message explaining the session cannot be joined

## Edge Cases

### Heartbeat Stops on Completed Session

1. End a session and verify the heartbeat interval has stopped
2. **Expected:** Console shows "[Session] Heartbeat stopped" and no further heartbeat mutations are sent (verify via Convex dashboard)

### Double-Tap Prevention on Create

1. Rapidly tap "Start Group Session" multiple times
2. **Expected:** Only one session is created (useRef guard prevents concurrent mutations)

### Back Navigation from Join Screen

1. After successfully joining a session, press the back button on GroupSessionScreen
2. **Expected:** Returns to WorkoutsScreen (not JoinSessionScreen, because navigation.replace was used)

### Session Not Found

1. Navigate to GroupSessionScreen with an invalid sessionId (e.g., modify route params)
2. **Expected:** "Session not found" error message with back button

## Failure Signals

- "Start Group Session" button does nothing or throws an unhandled error
- JoinSessionScreen does not show session preview after entering valid code
- Presence dots don't change color when a participant goes idle
- Timer countdown is not synchronized between devices (>2 second drift)
- "End Session" button visible to non-host participants
- No vibration on timer completion
- Session summary shows empty state despite logged sets
- Console shows repeated `[Session] Heartbeat stopped: mutation error` (backend API mismatch)
- TypeScript errors beyond the 44 known TS2307 `convex/react` path resolution errors

## Requirements Proved By This UAT

- R021 (Collaborative Live Workouts) — This UAT proves the full mobile group session flow: create → join → presence → set feed → shared timer → end → summary. Combined with the web UAT from S01-S03, this completes cross-platform delivery.
- R011 (Cross-Platform UI) — This UAT proves mobile screens consume the same Convex APIs as web with correct typing and rendering. The 2 screens and 4 components demonstrate consistent feature parity.

## Not Proven By This UAT

- **Live Convex backend integration** — All runtime test cases require a live Convex deployment. Artifact-driven verification (TypeScript compilation, file existence, pattern checks) is complete but doesn't prove runtime correctness.
- **119 pending verification script checks** — M003-M005 backend verification scripts are written and compile but require `npx convex login` to execute.
- **Deep linking** — Session invite via URL scheme is not implemented (D162). Users must manually enter invite codes.
- **Performance under load** — 10-participant session stress test is not part of this UAT.
- **Offline/reconnection behavior** — What happens when the app loses network and reconnects is not tested.

## Notes for Tester

- **Two devices needed** for tests 3-8. Alternatively, use one device + web browser at the same session URL for cross-platform verification.
- **Heartbeat timing**: Presence changes take up to 40 seconds worst-case (10s heartbeat interval + 30s cron). Be patient when testing presence indicator transitions.
- **Timer sync**: Server clock is authoritative. Expect ≤1 second drift between devices due to NTP.
- **Vibration**: May not work in iOS Simulator (physical device recommended for haptic testing).
- **Console logs**: Filter by `[Session]` prefix in React Native debugger or Expo dev tools to see all session lifecycle events.
- **Known rough edge**: SessionSummaryNative hardcodes "kg" for volume display — lbs users will see incorrect units on the summary screen. This is a known limitation documented for follow-up.
