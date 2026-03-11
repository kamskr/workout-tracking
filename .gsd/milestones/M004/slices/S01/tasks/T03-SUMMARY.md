---
id: T03
parent: S01
milestone: M004
provides:
  - /leaderboards page with exercise selector, metric/period pickers, ranked table, My Rank callout
  - Leaderboard opt-in toggle on own profile page
  - /leaderboards route auth-protected via middleware
  - Leaderboards nav link in Header (desktop + mobile)
key_files:
  - apps/web/src/app/leaderboards/page.tsx
  - apps/web/src/app/profile/[username]/page.tsx
  - apps/web/src/middleware.ts
  - apps/web/src/components/Header.tsx
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Used blue-600 accent (system blue) for selected pills and current-user highlight instead of gray-900 used in analytics PeriodSelector — differentiates leaderboard UI and matches competitive context
  - Period/metric pickers always pass "allTime" to the backend query since getLeaderboard/getMyRank currently only accept v.literal("allTime") — UI shows all 3 period options for future backend support
  - Used getProfile with user.id rather than creating a new getMyProfile query to fetch current user's username for the opt-in link
patterns_established:
  - Pill-style selector pattern with cn() utility reused for both MetricPicker and PeriodPicker components
  - Toggle switch pattern using role="switch" + aria-checked for accessible boolean toggles on profile page
  - data-leaderboard-* attributes for programmatic browser assertions (data-leaderboard-page, data-leaderboard-table, data-leaderboard-rank, data-leaderboard-exercise-select, data-leaderboard-optin)
observability_surfaces:
  - data-leaderboard-* CSS selectors enable programmatic assertions via document.querySelectorAll
  - Empty state messages expose descriptive failure states ("No exercises with rankings yet", "Not ranked — opt in on your profile")
  - Loading states use conditional rendering with "skip" pattern (D085)
duration: ~20 minutes
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Web UI — leaderboards page + profile opt-in toggle

**Built the `/leaderboards` page with exercise selector, metric/period pickers, ranked top-10 table with current-user highlighting, My Rank callout card, and a leaderboard opt-in toggle on the profile page.**

## What Happened

1. Added `/leaderboards(.*)` to the middleware protected routes matcher in `middleware.ts`.

2. Created `apps/web/src/app/leaderboards/page.tsx` (~290 lines) as a `"use client"` component with:
   - Exercise selector dropdown populated from `getLeaderboardExercises` with auto-select of first exercise
   - MetricPicker (Est. 1RM / Total Volume / Max Reps) and PeriodPicker (7 Days / 30 Days / All Time) as pill-style button groups
   - Leaderboard table with Rank (#), User (displayName + @username), Value columns; current user's row highlighted with blue-50 background and "You" badge
   - My Rank callout card showing rank + value, or "Not ranked — opt in on your profile" link when not opted in
   - All required data-* attributes: `data-leaderboard-page`, `data-leaderboard-table`, `data-leaderboard-rank`, `data-leaderboard-exercise-select`
   - Loading spinner, empty state, and "No exercises with rankings yet" states

3. Extended `apps/web/src/app/profile/[username]/page.tsx` with a Leaderboard section visible only on own profile, containing a toggle switch (role="switch") that calls `setLeaderboardOptIn` mutation. Added `data-leaderboard-optin` attribute.

4. Added "Leaderboards" navigation link in `Header.tsx` for both desktop and mobile menus.

5. Updated `packages/backend/convex/_generated/api.d.ts` to include the `leaderboards` module import and type registration (codegen couldn't be run without a live Convex deployment).

## Verification

- `cd apps/web && npx -p typescript tsc --noEmit` — **PASS** (only pre-existing clsx TS2307)
- `cd packages/backend && npx -p typescript tsc --noEmit -p convex` — **PASS** (0 errors)
- `grep "leaderboards" apps/web/src/middleware.ts` — **PASS** (shows `/leaderboards(.*)`)
- All 4+1 data attributes present: **PASS**
  - `data-leaderboard-page` in leaderboards/page.tsx
  - `data-leaderboard-table` in leaderboards/page.tsx
  - `data-leaderboard-rank` in leaderboards/page.tsx
  - `data-leaderboard-exercise-select` in leaderboards/page.tsx
  - `data-leaderboard-optin` in profile/[username]/page.tsx
- All 4 API calls wired: **PASS** (getLeaderboardExercises, getLeaderboard, getMyRank in leaderboards page; setLeaderboardOptIn in profile page)
- Page file exists at `apps/web/src/app/leaderboards/page.tsx` — **PASS**

### Slice-level verification (partial — T03 is the final task):
- LB-01 through LB-12 verification script: **NOT RUN** (requires running Convex backend; established in T02)
- `cd packages/backend && npx tsc --noEmit -p convex` — **PASS**
- `cd apps/web && npx tsc --noEmit` — **PASS** (pre-existing clsx TS2307 only)
- Browser visual verification: **NOT RUN** (no Convex backend or dev server available in current environment)

## Diagnostics

- `document.querySelectorAll('[data-leaderboard-table] tr')` counts visible rankings in the table
- `document.querySelector('[data-leaderboard-rank]')` inspects My Rank callout state
- `document.querySelector('[data-leaderboard-optin]')` inspects opt-in toggle state
- Empty states expose descriptive text for programmatic text assertions
- Loading states use `"skip"` pattern when exerciseId is null (D085)

## Deviations

- **Added `leaderboards` module to `api.d.ts` manually** — Convex codegen requires a running deployment/auth session which wasn't available. Added the import + type mapping following the exact pattern of existing modules. This will be overwritten cleanly on next `npx convex dev` run.
- **Period picker is UI-only** — The backend `getLeaderboard` and `getMyRank` queries currently only accept `period: v.literal("allTime")`. The UI renders all 3 period options but always passes `"allTime"` to the backend. When the backend is extended to support `"7d"` and `"30d"` periods, the UI state (`selectedPeriod`) is already wired and just needs to be passed through.

## Known Issues

- Period filtering (7d/30d) is cosmetic only — backend only accepts `"allTime"`. The period picker buttons render and toggle state correctly but don't affect the query.
- Browser visual verification was not performed (no Convex backend running in this environment).
- Slice verification script (`verify-s01-m04.ts`) was not re-run (requires running Convex backend).

## Files Created/Modified

- `apps/web/src/app/leaderboards/page.tsx` — New leaderboard page with exercise selector, metric/period pickers, ranked table, and My Rank callout
- `apps/web/src/app/profile/[username]/page.tsx` — Added leaderboard opt-in toggle section (own profile only)
- `apps/web/src/middleware.ts` — Added `/leaderboards(.*)` to protected routes
- `apps/web/src/components/Header.tsx` — Added Leaderboards nav link (desktop + mobile)
- `packages/backend/convex/_generated/api.d.ts` — Added leaderboards module import and type registration
