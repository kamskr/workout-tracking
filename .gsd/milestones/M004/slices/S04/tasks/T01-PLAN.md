---
estimated_steps: 5
estimated_files: 3
---

# T01: Add PillSelector, BadgeDisplayNative, and LeaderboardTableNative reusable components

**Slice:** S04 — Mobile Competitive Port
**Milestone:** M004

## Description

Create 3 reusable components in `apps/native/src/components/competitive/` that serve as building blocks for the competitive screens in T02 and the profile integration in T03. These are: (1) a generic string-value pill selector (the existing PeriodSelector only accepts `number | undefined`), (2) a badge grid display component following the ProfileStatsNative self-contained pattern, and (3) a leaderboard ranking table for FlatList-based display of ranked entries.

## Steps

1. Create `apps/native/src/components/competitive/PillSelectorNative.tsx` — A generic `PillSelectorNative<T extends string>` component accepting `options: { label: string; value: T }[]`, `selected: T`, and `onSelect: (value: T) => void`. Horizontal ScrollView with pill buttons, selected/unselected styling matching PeriodSelector (accent bg when selected, border+secondary when not). Use `colors`, `spacing`, `fontFamily` from theme.ts.

2. Create `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — Self-contained component with `userId: string` and `isOwnProfile?: boolean` props. Uses `useQuery(api.badges.getUserBadges, { userId })`. Three render states: (a) loading skeleton — 6 placeholder cards with animated opacity, (b) empty state — contextual message ("Complete workouts to earn badges!" for own profile, "No badges earned yet" for others), (c) populated grid — 3-column layout using `View` with `flexWrap` showing badge cards with emoji (24pt), name (bold 12px), and description (11px gray). Each card has rounded border and padding.

3. Create `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — Accepts `entries: Array<{ userId: string; value: number; displayName: string; username: string }>`, `currentUserId: string | undefined`, and `formatValue: (value: number) => string`. Renders a FlatList of ranked rows: rank number (bold), display name, username, formatted value. Highlights the current user's row with a subtle accent background and "You" badge. Shows 1-indexed rank numbers. Loading state for when entries is undefined.

4. Verify all 3 files exist and compile: `cd apps/native && npx tsc --noEmit`.

5. Verify imports are correct: each component imports from `@packages/backend/convex/_generated/api` (BadgeDisplayNative only) and `../../lib/theme` for theme constants.

## Must-Haves

- [ ] PillSelectorNative is generic over string values (not number | undefined like PeriodSelector)
- [ ] BadgeDisplayNative uses `useQuery(api.badges.getUserBadges, { userId })` — own data fetching, not prop-drilled
- [ ] BadgeDisplayNative handles loading/empty/populated states
- [ ] LeaderboardTableNative highlights current user's row with accent background
- [ ] All components use D007 theme constants (colors, spacing, fontFamily)
- [ ] All components follow D067 Native suffix convention
- [ ] All components placed in `components/competitive/` directory (D100 pattern)

## Verification

- `cd apps/native && npx tsc --noEmit` — 0 new errors beyond pre-existing TS2307
- `ls apps/native/src/components/competitive/` — shows `PillSelectorNative.tsx`, `BadgeDisplayNative.tsx`, `LeaderboardTableNative.tsx`
- `grep "useQuery" apps/native/src/components/competitive/BadgeDisplayNative.tsx` — confirms own data fetching
- `grep "PillSelectorNative" apps/native/src/components/competitive/PillSelectorNative.tsx` — confirms export

## Observability Impact

- Signals added/changed: BadgeDisplayNative logs `[BadgeDisplayNative]` prefix on any unexpected error during render. No runtime signals for PillSelector or LeaderboardTable (pure presentational).
- How a future agent inspects this: Grep for component names in imports to verify they're consumed. TypeScript compilation catches broken API references.
- Failure state exposed: BadgeDisplayNative shows loading spinner for `undefined` query state, empty state for empty array — both visible in Expo runtime.

## Inputs

- `apps/native/src/components/analytics/PeriodSelector.tsx` — Reference pattern for pill selector styling and ScrollView layout
- `apps/native/src/components/social/ProfileStatsNative.tsx` — Reference pattern for self-contained component with own useQuery, loading skeleton
- `apps/web/src/components/profile/BadgeDisplay.tsx` — Web badge grid to port (loading/empty/populated states, grid layout)
- `apps/native/src/lib/theme.ts` — colors, spacing, fontFamily constants
- `packages/backend/convex/badges.ts` — `getUserBadges` API shape: returns `Array<{ badgeSlug, name, emoji, description, category, awardedAt }>`

## Expected Output

- `apps/native/src/components/competitive/PillSelectorNative.tsx` — Generic pill selector component (~80 lines)
- `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — Badge grid component with own data fetching (~130 lines)
- `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — Ranked entry table component (~120 lines)
