# S02: Group Challenges — Backend + Web UI — UAT

**Milestone:** M004
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime + human-experience)
- Why this mode is sufficient: The 16-check verification script proves the complete challenge lifecycle programmatically (artifact-driven), the web UI requires visual inspection for layout and interaction quality (human-experience), and the cron job + scheduler behavior requires a running Convex backend (live-runtime).

## Preconditions

- Convex dev server running (`npx convex dev` in packages/backend)
- Web app running (`npm run dev` in apps/web)
- User authenticated via Clerk
- At least 2 user accounts available for multi-user testing (challenge join)
- Convex CLI authenticated (`npx convex login`) for verification script

## Smoke Test

1. Navigate to `/challenges` in the web app
2. **Expected:** Page loads with "Challenges" heading, StatusPicker pills (Active/Completed/My Challenges), and a "New Challenge" button. Empty state if no challenges exist.

## Test Cases

### 1. Challenge Creation

1. Click "New Challenge" button on /challenges
2. Fill in: title "Pull-up Challenge", type "Total Reps", select an exercise (e.g., Pull-up), set start date to now, end date to 7 days from now
3. Click "Create Challenge"
4. **Expected:** Challenge appears in the list with "active" status badge, type badge showing "totalReps", participant count of 1 (creator auto-joins), and time remaining display

### 2. Challenge Join and Standings

1. As a second user, navigate to /challenges
2. Click on the challenge created in test 1
3. Click "Join Challenge"
4. **Expected:** Join button disappears, "Leave" button appears, participant count increments to 2, standings table shows both users with rank 1 and 2 (both at 0)

### 3. Challenge Progress via Workout

1. As the second user, start a workout, add Pull-ups, log a set of 10 reps
2. Finish the workout
3. Navigate back to /challenges, click on the challenge
4. **Expected:** Standings table updates to show the second user with currentValue of 10, ranked #1

### 4. Challenge Cancellation

1. As the challenge creator, click on the challenge
2. Click "Cancel Challenge"
3. **Expected:** Challenge status changes to "cancelled", no action buttons visible, challenge appears under "Completed" filter

### 5. Status Filtering

1. Create 2 challenges: one active, one that you cancel
2. Click "Active" pill
3. **Expected:** Only the active challenge shows
4. Click "Completed" pill
5. **Expected:** Only the cancelled/completed challenge shows
6. Click "My Challenges" pill
7. **Expected:** Both challenges show (user participated in both)

### 6. Verification Script

1. Run `npx tsx packages/backend/scripts/verify-s02-m04.ts`
2. **Expected:** 16/16 checks pass (CH-01 through CH-16)

## Edge Cases

### Duplicate Join Prevention

1. Join a challenge, then try to join again
2. **Expected:** Error message "Already joined" appears inline

### Creator Cannot Leave

1. As the challenge creator, click "Leave Challenge"
2. **Expected:** Error message appears (creator must cancel, not leave)

### Non-Creator Cannot Cancel

1. As a non-creator participant, view a challenge
2. **Expected:** Cancel button is not visible (only Leave button shows)

### Challenge Detail with No Profile User

1. Have a user without a profile join a challenge
2. View standings
3. **Expected:** User appears in standings with userId as fallback identifier (no crash)

## Failure Signals

- `/challenges` page shows blank or error boundary instead of challenge list
- Creating a challenge fails silently (no error, no new challenge in list)
- Standings table doesn't update after logging sets in a workout
- Status badges show incorrect colors or text
- TypeScript compilation errors in `npx tsc --noEmit` (backend or web)
- Verification script reports any check as FAIL
- "Challenges" link missing from Header navigation
- Unauthenticated user can access /challenges (middleware bypass)

## Requirements Proved By This UAT

- **R019 (Group Challenges)** — Full lifecycle: creation with time bounds, join/leave, progress tracking from workout data, live standings, winner determination at deadline, cancellation. 4 challenge types (workoutCount, totalReps, totalVolume, maxWeight). Cron-based deadline enforcement. Web UI with full CRUD.

## Not Proven By This UAT

- **R019 mobile surface** — Mobile challenge screens deferred to S04
- **Live cron execution** — 15-minute cron interval cannot be observed in real-time during manual testing; only the `checkDeadlines` function is provable via test helpers
- **scheduler.runAt precision** — Scheduled completion/activation timing depends on Convex platform; test helpers bypass scheduling
- **Scale behavior** — Participant cap (100) not stress-tested, standings performance with many participants not measured
- **Challenge progress for all 4 types in UI** — Verification script tests all 4 types programmatically; manual UI testing likely covers only 1-2 types

## Notes for Tester

- The verification script (test case 6) is the most comprehensive check — if it passes 16/16, the backend is proven correct
- Challenge detail renders inline (not a separate route) — click a challenge card to see detail, click "Back to Challenges" to return to list
- Creator auto-joins their own challenge (D125) — participant count starts at 1
- Stale currentValue after workout deletion is a documented known limitation (D127) — don't test delete-then-verify-standings
- The cron job fires every 15 minutes — for manual testing, use the verification script's `testCompleteChallenge` helper instead of waiting for cron
- Status transitions: pending (future start) → active (start time reached) → completed (end time reached) or cancelled (creator cancels)
