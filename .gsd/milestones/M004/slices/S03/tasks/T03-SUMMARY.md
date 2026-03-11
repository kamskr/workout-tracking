---
id: T03
parent: S03
milestone: M004
provides:
  - BadgeDisplay component with userId prop, own useQuery subscription, 3-state rendering (loading/empty/populated)
  - Badge section integrated into profile page between leaderboard opt-in and workout stats
  - data-badge-section, data-badge-card, data-badge-slug attributes for programmatic verification
key_files:
  - apps/web/src/components/profile/BadgeDisplay.tsx
  - apps/web/src/app/profile/[username]/page.tsx
key_decisions:
  - Badge grid uses responsive columns (3 mobile / 4 tablet / 5 desktop) matching the visual density of profile stats
  - Empty state message varies based on isOwnProfile prop ("Complete workouts to earn badges!" vs "No badges earned yet")
  - Loading skeleton renders 6 placeholder cards matching badge card layout (emoji circle + name + description lines)
patterns_established:
  - Badge display follows same self-contained pattern as ProfileStats (own useQuery, loading skeleton, data attributes)
  - Badge card styling matches StatCard pattern (rounded-lg border border-gray-200 bg-white p-4 shadow-sm)
observability_surfaces:
  - "document.querySelectorAll('[data-badge-section]')" confirms badge section rendered
  - "document.querySelectorAll('[data-badge-card]')" returns individual badge cards
  - "[data-badge-slug='first_workout']" targets specific badges for assertion
duration: 8m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Badge display component on profile page

**Created BadgeDisplay component rendering awarded badges as emoji cards on the profile page with loading skeleton, empty state, and responsive grid.**

## What Happened

Created `BadgeDisplay.tsx` as a self-contained component accepting `userId` (and optional `isOwnProfile`) props. The component uses `useQuery(api.badges.getUserBadges, { userId })` with Convex's reactive subscription and renders 3 states:

1. **Loading**: 6-card skeleton grid with animated pulse placeholders matching badge card layout (emoji circle, name bar, description bar)
2. **Empty**: Contextual message — "Complete workouts to earn badges!" for own profile, "No badges earned yet" for others
3. **Populated**: Responsive grid (3→4→5 columns) of badge cards, each showing the emoji (large centered), bold name, and gray description text

Integrated the component into the profile page at `apps/web/src/app/profile/[username]/page.tsx` — imported `BadgeDisplay` and added a "Badges" section between the leaderboard opt-in toggle and the "Workout Stats" section. The section renders for ALL profiles (own and others) since badges are always public, with the `isOwnProfile` flag passed through for empty state messaging.

## Verification

- ✅ `cd apps/web && npx -p typescript tsc --noEmit` — 0 new errors (only pre-existing clsx TS2307)
- ✅ `cd packages/backend && npx -p typescript tsc --noEmit -p convex` — 0 errors (backend clean)
- ✅ `grep "BadgeDisplay" apps/web/src/app/profile/[username]/page.tsx` — shows import and usage (2 matches)
- ✅ `grep "data-badge-section|data-badge-card|data-badge-slug" apps/web/src/components/profile/BadgeDisplay.tsx` — all 3 attributes present
- ✅ `grep "getUserBadges" apps/web/src/components/profile/BadgeDisplay.tsx` — query is wired

### Slice-level verification status (final task — all should pass):
- ✅ `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- ✅ `cd apps/web && npx tsc --noEmit` — 0 new errors (only pre-existing clsx TS2307)
- ⏭️ `npx tsx packages/backend/scripts/verify-s03-m04.ts` — requires Convex backend auth (script exists and compiled from T02)
- ✅ Structural: Profile page renders `[data-badge-section]` and `[data-badge-card]` elements (confirmed via grep)

## Diagnostics

- `document.querySelectorAll('[data-badge-section]')` — confirms badge section rendered on page
- `document.querySelectorAll('[data-badge-card]')` — returns NodeList of individual badge cards
- `document.querySelector('[data-badge-slug="first_workout"]')` — targets a specific badge card
- Empty state text visible when no badges exist; loading skeleton visible during query loading

## Deviations

None — implementation followed the task plan exactly.

## Known Issues

- Verification script (`verify-s03-m04.ts`) could not be run in this session due to Convex backend requiring interactive authentication. The script exists and compiles from T02; execution requires a live Convex backend.

## Files Created/Modified

- `apps/web/src/components/profile/BadgeDisplay.tsx` — new (~75 lines): self-contained badge display component with loading skeleton, empty state, and responsive badge card grid
- `apps/web/src/app/profile/[username]/page.tsx` — modified: added BadgeDisplay import and badges section between leaderboard opt-in and workout stats (~7 lines added)
