---
estimated_steps: 5
estimated_files: 3
---

# T03: Web UI — leaderboards page + profile opt-in toggle

**Slice:** S01 — Leaderboards — Backend + Web UI
**Milestone:** M004

## Description

Build the user-facing `/leaderboards` page with exercise selector, metric picker (e1RM/Volume/Reps), period picker (7d/30d/All Time), ranked top-10 table with user info, and a "My Rank" callout card. Add a leaderboard opt-in toggle to the profile page (visible only on own profile). Add `/leaderboards(.*)` to the middleware protected routes matcher. This task delivers the visible product outcome of S01.

## Steps

1. **Add `/leaderboards(.*)` to middleware** — In `apps/web/src/middleware.ts`, add `"/leaderboards(.*)"` to the `isProtectedRoute` matcher array, alongside existing protected routes.

2. **Create `/leaderboards` page** — New file `apps/web/src/app/leaderboards/page.tsx` as a `"use client"` component:
   - **State:** `selectedExerciseId` (null initially), `selectedMetric` ("e1rm" | "volume" | "reps", default "e1rm"), `selectedPeriod` ("allTime" | "7d" | "30d", default "allTime")
   - **Exercise selector:** Use `useQuery(api.leaderboards.getLeaderboardExercises)` to populate a `<select>` dropdown. Auto-select first exercise when data loads. Show "No exercises with rankings yet" empty state if empty.
   - **Metric picker:** Pill-style buttons (reuse PeriodSelector pattern from analytics page) for e1RM, Volume, Reps. Labels: "Est. 1RM", "Total Volume", "Max Reps".
   - **Period picker:** Pill-style buttons for "7 Days", "30 Days", "All Time".
   - **Leaderboard table:** `useQuery(api.leaderboards.getLeaderboard, ...)` with `"skip"` when exerciseId is null. Render a table with columns: Rank (#), User (displayName + @username), Value (formatted: e1RM/volume in kg, reps as count). Highlight the current user's row with a distinct background color. Show loading spinner while data is undefined. Show "No rankings yet" if entries is empty.
   - **My Rank callout:** `useQuery(api.leaderboards.getMyRank, ...)` with `"skip"` when exerciseId is null. Show a card below the table: "Your Rank: #N" with value, or "Not ranked — opt in on your profile" if rank is null. Link "opt in on your profile" to `/profile/[username]`.
   - **Data attributes:** `data-leaderboard-page` on outer container, `data-leaderboard-table` on the table element, `data-leaderboard-rank` on the my-rank callout, `data-leaderboard-exercise-select` on the exercise dropdown.
   - **Design:** Follow clean/minimal (D007) — white background, subtle gray borders, system blue accent for selected pills and current user highlight. Match the analytics page layout pattern.

3. **Add leaderboard opt-in toggle to profile page** — In `apps/web/src/app/profile/[username]/page.tsx`:
   - Query the current profile's `leaderboardOptIn` field (already available from `getProfile` if schema is correct, or query separately).
   - Below the existing profile info section (only when viewing own profile), add a "Leaderboard" section with a toggle switch: "Show my rankings on public leaderboards". Use `useMutation(api.leaderboards.setLeaderboardOptIn)` on toggle change.
   - Add `data-leaderboard-optin` attribute on the toggle container.
   - Style as a simple flex row with label + toggle (checkbox styled as toggle or native checkbox with label).

4. **Add navigation link to leaderboards** — Add a "Leaderboards" link in the app's Header component or navigation area (if a nav exists) to make the page discoverable. If no global nav exists, ensure the analytics page or profile page links to `/leaderboards`.

5. **Verify TypeScript compilation** — `cd apps/web && npx tsc --noEmit` passes with 0 new errors (pre-existing clsx TS2307 is acceptable).

## Must-Haves

- [ ] `/leaderboards` route is auth-protected via middleware
- [ ] Leaderboard page renders exercise selector populated from `getLeaderboardExercises`
- [ ] Metric picker with e1RM/Volume/Reps options
- [ ] Period picker with 7d/30d/All Time options
- [ ] Top-10 ranked table with user info (displayName, username) and formatted values
- [ ] Current user's row highlighted in the table
- [ ] "My Rank" callout card below the table
- [ ] Profile page has leaderboard opt-in toggle (own profile only)
- [ ] All data-* attributes present: `data-leaderboard-page`, `data-leaderboard-table`, `data-leaderboard-rank`, `data-leaderboard-optin`
- [ ] TypeScript compiles with 0 new errors in web package

## Verification

- `cd apps/web && npx tsc --noEmit` passes with 0 new errors
- `grep "leaderboards" apps/web/src/middleware.ts` shows route in protected matcher
- `grep "data-leaderboard-page\|data-leaderboard-table\|data-leaderboard-rank\|data-leaderboard-optin" apps/web/src/app/leaderboards/page.tsx apps/web/src/app/profile/\\[username\\]/page.tsx` shows all 4 data attributes
- `grep "getLeaderboard\|getMyRank\|setLeaderboardOptIn\|getLeaderboardExercises" apps/web/src/app/leaderboards/page.tsx` shows all 4 API calls wired
- Page file exists at `apps/web/src/app/leaderboards/page.tsx`

## Observability Impact

- Signals added/changed: None (UI-only task; backend observability established in T01-T02)
- How a future agent inspects this: `data-leaderboard-*` attributes enable programmatic browser assertions via CSS selectors. `document.querySelectorAll('[data-leaderboard-table] tr')` counts visible rankings.
- Failure state exposed: Empty states show descriptive messages ("No exercises with rankings yet", "Not ranked — opt in on your profile"). Loading states use conditional rendering with "skip" pattern (D085).

## Inputs

- `packages/backend/convex/leaderboards.ts` — getLeaderboard, getMyRank, setLeaderboardOptIn, getLeaderboardExercises from T02
- `packages/backend/convex/schema.ts` — leaderboardOptIn field on profiles from T01
- `apps/web/src/app/analytics/page.tsx` — PeriodSelector pattern to replicate for metric/period pickers
- `apps/web/src/app/profile/[username]/page.tsx` — existing profile page to extend with opt-in toggle
- `apps/web/src/middleware.ts` — existing protected routes to extend

## Expected Output

- `apps/web/src/app/leaderboards/page.tsx` — new file (~200-250 lines) with full leaderboard page
- `apps/web/src/app/profile/[username]/page.tsx` — modified with leaderboard opt-in toggle section
- `apps/web/src/middleware.ts` — modified with `/leaderboards(.*)` in protected routes
