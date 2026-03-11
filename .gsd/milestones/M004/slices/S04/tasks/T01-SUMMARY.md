---
id: T01
parent: S04
milestone: M004
provides:
  - PillSelectorNative generic string-value pill selector component
  - BadgeDisplayNative self-contained badge grid with own data fetching
  - LeaderboardTableNative ranked entry table with current user highlighting
key_files:
  - apps/native/src/components/competitive/PillSelectorNative.tsx
  - apps/native/src/components/competitive/BadgeDisplayNative.tsx
  - apps/native/src/components/competitive/LeaderboardTableNative.tsx
key_decisions:
  - PillSelectorNative uses percentage-based width string cast for 3-column grid (same pattern as BadgeDisplayNative)
  - LeaderboardTableNative uses scrollEnabled=false FlatList for embedding inside parent ScrollView screens
  - BadgeDisplayNative loading skeleton uses Animated.loop with opacity pulse (native driver) instead of Reanimated dependency
patterns_established:
  - components/competitive/ directory for competitive feature native components (D100 pattern)
  - Self-contained data-fetching components with loading/empty/populated tri-state rendering
  - Generic type parameter components for reusable selectors (PillSelectorNative<T extends string>)
observability_surfaces:
  - BadgeDisplayNative: loading state (undefined query) and empty state (empty array) visible in Expo runtime
  - LeaderboardTableNative: loading spinner and empty state visible for inspection
duration: 8 minutes
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add PillSelector, BadgeDisplayNative, and LeaderboardTableNative reusable components

**Created 3 reusable competitive feature components in `apps/native/src/components/competitive/` — a generic string-value pill selector, a self-contained badge grid with own Convex data fetching, and a ranked leaderboard table with current-user highlighting.**

## What Happened

Created the `components/competitive/` directory and implemented three building-block components for the mobile competitive feature port:

1. **PillSelectorNative** (~90 lines) — Generic `<T extends string>` pill selector accepting `options`, `selected`, and `onSelect` props. Horizontal ScrollView with pill buttons matching PeriodSelector styling (accent bg when selected, border+secondary when not). Includes accessibility roles and labels.

2. **BadgeDisplayNative** (~165 lines) — Self-contained component with `userId` and `isOwnProfile` props. Uses `useQuery(api.badges.getUserBadges, { userId })` for own data fetching. Three render states: (a) animated skeleton with 6 placeholder cards using Animated opacity loop, (b) contextual empty state messages, (c) 3-column flexWrap grid of badge cards with emoji (24pt), name (bold 12px), and description (11px gray).

3. **LeaderboardTableNative** (~170 lines) — Accepts `entries`, `currentUserId`, and `formatValue` props. FlatList-based ranked rows with: rank number (bold), display name, username, formatted value. Current user's row highlighted with 6% accent tint background and "You" badge pill. Loading spinner for undefined entries, empty state for empty array.

All components use D007 theme constants (colors, spacing, fontFamily), follow D067 Native suffix convention, and are placed in the D100 competitive/ directory pattern.

## Verification

- `ls apps/native/src/components/competitive/` → shows `PillSelectorNative.tsx`, `BadgeDisplayNative.tsx`, `LeaderboardTableNative.tsx` ✅
- `cd apps/native && npx -p typescript tsc --noEmit` → 35 errors, all pre-existing TS2307 for `convex/react`. Only one from new files (`BadgeDisplayNative.tsx` importing `convex/react`). Zero non-TS2307 errors. ✅
- `grep "useQuery" apps/native/src/components/competitive/BadgeDisplayNative.tsx` → confirms `useQuery(api.badges.getUserBadges, { userId })` ✅
- `grep "PillSelectorNative" apps/native/src/components/competitive/PillSelectorNative.tsx` → confirms export ✅
- `grep "T extends string" apps/native/src/components/competitive/PillSelectorNative.tsx` → confirms generic string constraint ✅
- `grep "rowHighlighted" apps/native/src/components/competitive/LeaderboardTableNative.tsx` → confirms accent row highlighting ✅
- `cd packages/backend && npx -p typescript tsc --noEmit -p convex` → 0 errors (regression check) ✅
- `cd apps/web && npx -p typescript tsc --noEmit` → 1 pre-existing TS2307 (clsx), no new errors ✅

### Slice-level verification (partial — T01 is first of slice):
- `ls apps/native/src/components/competitive/` → ✅ all 3 files present
- `grep -r "api.badges" apps/native/src/` → ✅ hits for `getUserBadges`
- Backend regression: ✅ 0 errors
- Web regression: ✅ no new errors
- Remaining slice checks (screens, tabs, leaderboard/challenge APIs) → expected to pass after T02/T03

## Diagnostics

- BadgeDisplayNative shows loading spinner for `undefined` query state, empty state for empty array — both visible in Expo runtime
- LeaderboardTableNative shows ActivityIndicator for undefined entries, empty message for empty array
- PillSelectorNative is pure presentational — no runtime diagnostics needed
- All components can be inspected by grepping for their names in future screen imports

## Deviations

- BadgeDisplayNative uses `Animated.loop` with native driver opacity pulse for skeleton instead of a third-party animation library — avoids adding a Reanimated dependency for a simple effect
- LeaderboardTableNative renders with `scrollEnabled={false}` to support embedding inside parent ScrollView screens (common pattern for screens with multiple sections)

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/components/competitive/PillSelectorNative.tsx` — Generic string-value pill selector component with horizontal ScrollView layout
- `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — Self-contained badge grid with own Convex data fetching, loading/empty/populated states
- `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — Ranked leaderboard entry table with current-user highlighting and "You" badge
