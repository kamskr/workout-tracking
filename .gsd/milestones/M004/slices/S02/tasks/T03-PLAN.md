---
estimated_steps: 4
estimated_files: 3
---

# T03: Web UI — /challenges page, navigation, middleware

**Slice:** S02 — Group Challenges — Backend + Web UI
**Milestone:** M004

## Description

Delivers the complete web user interface for group challenges at `/challenges`. Users can browse challenges by status, create new challenges, view live standings, and join/leave/cancel challenges. The page follows the established leaderboards page pattern (pill pickers, data attributes, auth-gated queries). Adds navigation links in Header and route protection in middleware.

This task connects T01+T02's backend API to a real user-facing UI, completing the R019 web surface.

## Steps

1. **Create `/challenges` page with challenge list and status filtering:**
   - Create `apps/web/src/app/challenges/page.tsx` as a `"use client"` component
   - Add `data-challenge-page` attribute on the main container
   - **StatusPicker** component: pill-style filter with "Active", "Completed", "My Challenges" options, following MetricPicker pattern from leaderboards page (cn() utility, blue-600 active, gray-100 inactive). Add `data-challenge-list` on the list container.
   - **ChallengeList**: Use `useQuery(api.challenges.listChallenges, { status, myOnly })` based on selected status filter. Render cards showing: title, type badge (color-coded pills for totalReps/totalVolume/workoutCount/maxWeight), participant count, time remaining (for active) or winner name (for completed) or "Cancelled" badge. Each card clickable to expand detail view.
   - Handle loading state (spinner) and empty state ("No challenges found" with prompt to create one)
   - Format type labels: totalReps → "Total Reps", totalVolume → "Total Volume", workoutCount → "Workout Count", maxWeight → "Max Weight"

2. **Add CreateChallengeForm as an inline expandable section:**
   - "Create Challenge" button that expands a form section (not a modal — simpler for single-page architecture)
   - Add `data-challenge-create` attribute on the form container
   - Form fields: title (text input, required), type (pill picker: Total Reps / Total Volume / Workout Count / Max Weight), exercise selector (dropdown, shown only for exercise-specific types — use `useQuery(api.exercises.listExercises)` or `api.leaderboards.getLeaderboardExercises`), start date (date input, defaults to now), end date (date input, required)
   - Validation: title required, endAt > startAt, exercise required for non-workoutCount types
   - Submit calls `useMutation(api.challenges.createChallenge)` with timestamps converted from date inputs to ms-since-epoch
   - On success: collapse form, selected challenge shows in list
   - Error display: inline error message below form

3. **Add ChallengeDetail with standings table and action buttons:**
   - When a challenge card is clicked, show detail view below or replacing the list (single-page pattern, not a new route)
   - Add `data-challenge-detail` attribute on the detail container
   - Use `useQuery(api.challenges.getChallengeStandings, { challengeId })` for standings data
   - **Standings table** (`data-challenge-standings`): Rank | User (displayName + @username) | Score columns. Current user highlighted (blue-50 bg, "You" badge — same pattern as leaderboards). Format score based on challenge type (reps count, kg for weight/volume, count for workouts).
   - **Challenge info**: title, type badge, exercise name (if applicable), start/end dates formatted, status badge (green for active, gray for completed, red for cancelled), creator name, participant count
   - **Action buttons** (`data-challenge-join` on join button):
     - "Join Challenge" — shown when user is not a participant and challenge is active/pending. Calls `joinChallenge` mutation.
     - "Leave Challenge" — shown when user is a participant but not the creator and challenge is active/pending. Calls `leaveChallenge` mutation.
     - "Cancel Challenge" — shown when user is the creator and challenge is pending/active. Red/destructive styling. Calls `cancelChallenge` mutation.
   - Winner display: for completed challenges, show winner name with trophy emoji
   - Back button to return to list view

4. **Wire navigation and middleware:**
   - In `Header.tsx`: add "Challenges" link after "Leaderboards" in the desktop authenticated nav section (same structure as the Leaderboards link — `Link` wrapping a styled button). Add matching `DisclosureButton as={Link}` in mobile menu after "Leaderboards" entry.
   - In `middleware.ts`: add `/challenges(.*)` to the `isProtectedRoute` matcher array, after `/leaderboards(.*)`.
   - Verify all `data-challenge-*` attributes are present: `data-challenge-page`, `data-challenge-list`, `data-challenge-detail`, `data-challenge-standings`, `data-challenge-create`, `data-challenge-join`

## Must-Haves

- [ ] `/challenges` page renders with StatusPicker (Active/Completed/My Challenges)
- [ ] Challenge list shows cards with title, type badge, participant count, time info
- [ ] CreateChallengeForm with type picker, exercise selector (conditional), date inputs
- [ ] ChallengeDetail with ranked standings table, challenge info, and action buttons
- [ ] Join/Leave/Cancel buttons with correct visibility logic per user role and challenge status
- [ ] All 6 `data-challenge-*` attributes present on appropriate containers
- [ ] "Challenges" link in Header for both desktop and mobile authenticated menus
- [ ] `/challenges(.*)` in middleware protected routes
- [ ] Current user highlighted in standings with "You" badge
- [ ] Winner displayed for completed challenges
- [ ] Loading and empty states handled
- [ ] TypeScript compiles with 0 new errors

## Verification

- `cd apps/web && npx tsc --noEmit` — 0 new errors (pre-existing clsx TS2307 only)
- `grep "data-challenge-page\|data-challenge-list\|data-challenge-detail\|data-challenge-standings\|data-challenge-create\|data-challenge-join" apps/web/src/app/challenges/page.tsx` shows all 6 attributes
- `grep "Challenges" apps/web/src/components/Header.tsx` shows nav link in both desktop and mobile sections
- `grep "challenges" apps/web/src/middleware.ts` shows the protected route
- `ls apps/web/src/app/challenges/page.tsx` — file exists
- Structural: page imports from `@packages/backend/convex/_generated/api` for type-safe Convex bindings

## Observability Impact

- Signals added/changed: None at runtime — UI components use Convex reactive queries which handle errors via React error boundaries (existing ErrorBoundary.tsx). Mutation errors (from T02's auth-gated functions) surface as caught errors in mutation callbacks.
- How a future agent inspects this: All 6 `data-challenge-*` attributes enable `document.querySelectorAll('[data-challenge-*]')` for programmatic browser assertions. Challenge list reactively updates on Convex subscription changes. Status badges provide visual state-machine verification.
- Failure state exposed: Empty states ("No challenges found") and error messages (inline below form) are visible in the UI. Loading spinners indicate pending queries.

## Inputs

- `packages/backend/convex/challenges.ts` — T01+T02's complete API (7 public + 3 internal functions)
- `packages/backend/convex/_generated/api.d.ts` — T01's manual module additions enabling `api.challenges.*` type bindings
- `apps/web/src/app/leaderboards/page.tsx` — UI pattern template (pill pickers, data attributes, ranked table, loading/empty states, cn() utility)
- `apps/web/src/components/Header.tsx` — nav link insertion points (desktop at ~line 73, mobile at ~line 138)
- `apps/web/src/middleware.ts` — protected route matcher list
- `apps/web/src/lib/utils.ts` — `cn()` utility for className merging

## Expected Output

- `apps/web/src/app/challenges/page.tsx` — new file (~450-550 lines) with StatusPicker, ChallengeList, CreateChallengeForm, ChallengeDetail components
- `apps/web/src/components/Header.tsx` — 2 additions: desktop "Challenges" link + mobile "Challenges" DisclosureButton
- `apps/web/src/middleware.ts` — 1 line added: `/challenges(.*)` in protected routes array
