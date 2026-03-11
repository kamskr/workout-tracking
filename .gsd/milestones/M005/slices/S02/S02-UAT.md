# S02: Shared Timer, Session Lifecycle & Combined Summary — UAT

**Milestone:** M005
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend correctness is provable via the 10-check verification script (artifact-driven). Timer sync accuracy requires two browser windows on a live Convex backend (live-runtime). Summary rendering and host-only controls require visual confirmation (human-experience for edge polish).

## Preconditions

- Convex backend deployed and running (`npx convex dev` or production deployment)
- Clerk authentication configured and functional
- Two user accounts available for testing (one will be host, one joiner)
- Web app running at `http://localhost:3000` (or deployed URL)

## Smoke Test

1. Log in as User A → create a group session → copy invite link
2. Log in as User B in a second browser → paste invite link → join session
3. As User A, click "Start Timer" with 60s selected → both windows should show countdown
4. As User A, click "End Session" → both windows should show combined summary

## Test Cases

### 1. Shared Timer Start

1. Create a session and have both users join
2. As either participant, select 60s duration and click "Start Timer"
3. **Expected:** Both browser windows show SVG ring countdown decreasing from 60. Countdown values within ~1 second of each other.

### 2. Timer Pause and Skip

1. Start a 90s timer
2. Click "Pause" — both windows should show idle timer state (duration picker + Start button)
3. Start a new 60s timer
4. Click "Skip" — both windows should return to idle state
5. **Expected:** Pause and Skip both clear the timer. No "resume from where it was" (D155).

### 3. Non-Host Timer Control (D140)

1. As the non-host participant, start a 30s timer
2. **Expected:** Timer starts for both participants. Any participant can control the timer.

### 4. Timer Auto-Complete

1. Start a 10s timer (or use 30s and wait)
2. **Expected:** When countdown reaches 0, timer shows "Done!" briefly (green check), then returns to idle state with duration picker.

### 5. End Session — Host Only

1. As the non-host participant, look at the session page header
2. **Expected:** "End Session" button is NOT visible to non-host users
3. As the host, verify "End Session" button IS visible (red styling)

### 6. End Session Triggers Summary

1. Have both participants log at least one exercise with sets
2. As host, click "End Session"
3. **Expected:** Both windows transition from live session view (participants + set feed + timer) to summary view showing per-participant cards with: display name, exercise count, set count, total volume (kg), and workout duration.

### 7. Summary Data Accuracy

1. In the summary view, verify each participant's stats
2. **Expected:** Exercise counts, set counts, and volume totals match what was actually logged during the session. Duration is calculated from workout start to session end.

### 8. Session Timeout Auto-Complete

1. Create a session, join with both users, then close both browser windows
2. Wait 20 minutes (15-min threshold + up to 5-min cron interval)
3. Re-open a browser and check the session
4. **Expected:** Session status is "completed" (auto-completed by `checkSessionTimeouts` cron)

## Edge Cases

### Already-Completed Session Navigation

1. Navigate to a session URL after the session has been ended
2. **Expected:** Page shows the summary view, not the live session view. No errors.

### End Session Idempotency

1. As host, click "End Session" twice quickly (or call mutation twice)
2. **Expected:** No error. Second call is a no-op. Session remains "completed".

### Timer With No Participants Watching

1. Start a timer, then navigate away from the session page
2. Navigate back before timer expires
3. **Expected:** Timer shows correct remaining time (computed from server timestamp, not client clock)

## Failure Signals

- Timer countdown not appearing on one window while showing on the other
- Timer drift >2 seconds between two browser windows on the same network
- "End Session" button visible to non-host users
- Summary view missing participant data or showing incorrect volumes
- Session still showing "active" after 25+ minutes with no heartbeats
- TypeScript compilation errors in any of the 3 packages
- Console errors related to `[Session]` prefixed mutations

## Requirements Proved By This UAT

- R021 (Collaborative Live Workouts) — Shared timer sync across participants, session end/summary lifecycle, and abandoned session auto-timeout. Combined with S01 (session creation, joining, presence, set feed), this proves the core collaborative experience minus finishWorkout hook integration and mobile.

## Not Proven By This UAT

- R021 finishWorkout integration — participant workout completion flowing into feed items, leaderboard entries, challenge progress, and badge evaluation (S03 scope)
- R021 mobile port — GroupSessionScreen, SessionLobbyScreen, JoinSessionScreen on React Native (S04 scope)
- R021 two-browser comprehensive end-to-end flow — creating → joining → logging sets → timer → presence idle → end → summary in one continuous test (S03 verification scope)
- Timer sync under poor network conditions or significant clock skew
- Session behavior with 5+ concurrent participants (performance at scale)

## Notes for Tester

- Timer sync testing requires two browsers pointed at the same Convex backend. Use two browser profiles or incognito + regular to have two separate Clerk sessions.
- The "Done!" state after timer expires only shows for ~3 seconds before returning to idle — don't blink.
- Volume is displayed in kg in the summary view regardless of user unit preference (known limitation, D157 extension).
- The verification script (`npx tsx packages/backend/scripts/verify-s02-m05.ts`) covers backend correctness programmatically — run it first to confirm the API layer before testing UI.
- Timer accuracy is bounded by NTP clock skew (typically <100ms on modern systems). If you see >1 second drift, check if one machine has clock sync issues.
