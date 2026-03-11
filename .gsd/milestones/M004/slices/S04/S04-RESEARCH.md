# S04: Mobile Competitive Port — Research

**Date:** 2026-03-11

## Summary

S04 ports all three M004 competitive features — leaderboards, challenges, and badges — to the React Native mobile app. The backend is already complete (S01–S03 delivered all Convex queries/mutations). This slice creates zero backend changes — it's purely UI: 2 new screens (LeaderboardScreen, ChallengesScreen), 1 new reusable component (BadgeDisplayNative), badge display integration on ProfileScreen and OtherProfileScreen, leaderboard opt-in toggle on ProfileScreen, and 2 new tabs in the bottom tab navigator.

The primary design question is navigation: the app currently has 6 tabs (Exercises, Workouts, Templates, Analytics, Feed, Profile). Adding Leaderboards and Challenges as separate tabs would push to 8 — too many for comfortable one-thumb bottom-tab navigation. The recommended approach is to **nest Leaderboards and Challenges as sub-screens within the existing Feed tab stack** (renamed to "Compete" or kept as "Feed" with navigation entry points), or add a single "Compete" tab that contains both Leaderboards and Challenges as nested screens. This keeps the tab count at 7 (the absolute maximum) or 6 (by consolidating Feed into the Compete tab). The web leaderboard and challenge pages each have a "Back to workouts" link pattern that translates naturally to stack navigator push/pop on mobile.

The badge integration is straightforward: BadgeDisplayNative is a self-contained component that calls `getUserBadges` and renders a grid — it drops into ProfileScreen and OtherProfileScreen between the leaderboard opt-in toggle and workout stats, mirroring the web profile page layout (D131). The leaderboard opt-in toggle is already a proven pattern — the web profile page has it and the ProfileScreen already has a Settings section with toggles.

## Recommendation

**Create a "Compete" tab (7th tab) with nested stack:** LeaderboardScreen and ChallengesScreen are independent screens within a CompeteStack navigator. The Compete tab shows a landing screen with cards/links to "Leaderboards" and "Challenges", or defaults to showing the challenge list (higher engagement surface) with a tab bar at the top to switch between the two views. This is the cleanest approach because:

1. Both leaderboards and challenges are discovery/browse experiences (not drill-down from existing content), so they deserve their own tab entry point
2. 7 tabs is the maximum but still usable — Strava, Fitbit, and Hevy all use 5-7 tabs
3. Nesting under Feed would make Feed confusing (social feed + competitive features = unclear purpose)
4. The existing pattern from D078 already consolidated Settings into Profile to get from 7→6 tabs — adding one back to 7 is within the established ceiling

**Alternative considered (nest in existing tabs):** Rejected because leaderboards/challenges don't naturally belong under any existing tab. They're not analytics (Analytics is personal stats), not workouts (Workouts is logging), and not feed (Feed is social timeline). A dedicated competitive tab is the cleanest UX.

**Badge integration:** Add BadgeDisplayNative to ProfileScreen (own profile, between opt-in toggle and stats) and OtherProfileScreen (other users' profiles, between follow button area and stats). This mirrors the exact web profile page layout.

**Challenge create form:** The web uses `datetime-local` HTML inputs. React Native has no built-in date picker. Two options: (a) TextInput with manual date entry (simple but poor UX), or (b) add `@react-native-community/datetimepicker` (~4KB). Given the project avoids unnecessary dependencies (D042, D056), use plain TextInput for date entry with validation, consistent with the existing freeform input patterns. If UX feels too friction-heavy, `@react-native-community/datetimepicker` can be added as a follow-up.

**Exercise picker for challenges:** Reuse the existing `ExercisePicker` modal component (full-screen FlatList with filters) already proven in ActiveWorkoutScreen. Adapt it to return the selected exercise ID instead of adding it to a workout.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Pill selector (metrics, periods, status) | `PeriodSelector` component in `components/analytics/` | Already handles horizontal scroll pill pattern with selected/unselected states. Accepts generic `periods` array. Reuse for metric/period/status pickers. |
| Exercise picker for challenge creation | `ExercisePicker` component in `components/` | Full-screen modal with search, filters, and FlatList. Already has exercise data fetching. |
| Profile stats pattern | `ProfileStatsNative` component in `components/social/` | Self-contained component with own `useQuery`, loading skeleton, stat card grid. Badge display follows same pattern. |
| Leaderboard opt-in toggle | Web profile page toggle pattern | role="switch" toggle with `setLeaderboardOptIn` mutation — port to RN `TouchableOpacity` + state. |
| Badge display | Web `BadgeDisplay` component | Self-contained query + grid pattern — port to RN View + responsive columns. |
| Challenge list scrolling | `FeedScreen` FlatList pattern | `usePaginatedQuery` or plain `useQuery` with FlatList, status-based empty/loading/populated rendering. |
| Stack navigation drill-down | `FeedStack` / `ProfileStack` pattern | Nested stack navigators within tabs for push/pop drill-down. |

## Existing Code and Patterns

- `apps/native/src/navigation/MainTabs.tsx` — Bottom tab navigator with 6 tabs. Each tab wraps a stack navigator for drill-down. **Pattern to follow** when adding the 7th "Compete" tab with CompeteStack containing LeaderboardScreen and ChallengesScreen.
- `apps/native/src/components/analytics/PeriodSelector.tsx` — Generic pill selector accepting `{ label, value }[]`. **Reuse directly** for metric picker, period picker, and status filter pills on leaderboard and challenge screens. Needs type generalization (currently `value: number | undefined`; leaderboard needs string values).
- `apps/native/src/screens/FeedScreen.tsx` — FlatList + `usePaginatedQuery` pattern with 5 status-based rendering states. **Reuse pattern** for challenge list (though challenges use plain `useQuery`, not paginated).
- `apps/native/src/screens/ProfileScreen.tsx` — Own-profile view with inline edit, Settings section, ProfileStatsNative integration. **Modify to add** leaderboard opt-in toggle (between profile card and stats) and BadgeDisplayNative (between opt-in toggle and stats).
- `apps/native/src/screens/OtherProfileScreen.tsx` — Other-user profile view with FollowButton + ProfileStatsNative. **Modify to add** BadgeDisplayNative between profile info and stats.
- `apps/native/src/components/ExercisePicker.tsx` — Full-screen modal exercise picker with search + filters. **Adapt or reuse** for challenge creation form's exercise selection.
- `apps/native/src/components/social/ProfileStatsNative.tsx` — Self-contained component with own `useQuery(api.profiles.getProfileStats)`. **Badge display follows this exact pattern**: own `useQuery(api.badges.getUserBadges)`, loading skeleton, grid of cards.
- `apps/native/src/lib/theme.ts` — `colors`, `spacing`, `fontFamily` constants. All new components use these for D007 compliance.
- `packages/backend/convex/leaderboards.ts` — 4 auth-gated functions consumed by mobile: `getLeaderboard`, `getMyRank`, `setLeaderboardOptIn`, `getLeaderboardExercises`.
- `packages/backend/convex/challenges.ts` — 7 auth-gated functions consumed by mobile: `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`, `getChallengeStandings`, `listChallenges`, `getChallenge`.
- `packages/backend/convex/badges.ts` — 1 auth-gated function consumed by mobile: `getUserBadges` (returns enriched badges with emoji, name, description).
- `packages/backend/convex/lib/badgeDefinitions.ts` — Framework-agnostic badge definitions. Mobile can import if needed for a "badges to earn" display, but `getUserBadges` already enriches with display metadata so direct import is unnecessary for the display case.
- `apps/web/src/app/leaderboards/page.tsx` — Web leaderboard page (~405 lines). Reference for UX flow: exercise selector → metric/period pills → ranked table → My Rank callout. Port to RN ScrollView with FlatList for rankings.
- `apps/web/src/app/challenges/page.tsx` — Web challenges page (~530 lines). Reference for UX flow: status pills → challenge list → inline detail view → standings table → create form. Port to RN stack navigation (list → detail screens).
- `apps/web/src/components/profile/BadgeDisplay.tsx` — Web badge grid. Simple port: loading skeleton → empty state → grid of badge cards with emoji + name + description.

## Constraints

- **7-tab maximum for bottom navigation** — 6 tabs currently. Adding "Compete" as the 7th is at the limit. 8+ tabs would require a "More" menu or different navigation architecture. D078 already set 6 as the "maximum" but that was pre-M004.
- **No `datetime-local` input in React Native** — Challenge creation requires start/end date input. Must use TextInput with validation, custom date picker modal, or `@react-native-community/datetimepicker` (not currently a dependency).
- **PeriodSelector types** — Current PeriodSelector accepts `value: number | undefined`. Leaderboard metric picker needs `value: string` ("e1rm" / "volume" / "reps"). Either generalize PeriodSelector to accept `string | number | undefined` or create a new `PillSelector` component.
- **No `cn()` utility in native** — Web uses `cn()` (clsx) for conditional class merging. RN uses `StyleSheet.create` + array styles. All conditional styling must use RN's `[baseStyle, condition && modifierStyle]` pattern.
- **ExercisePicker couples to workoutId** — Current ExercisePicker takes a `workoutId` prop and adds the exercise to the workout via `addExerciseToWorkout` mutation. Challenge creation needs exercise selection without the workout coupling. Need a "select-only" mode or a separate simpler exercise picker.
- **Convex `useQuery` with "skip"** — Conditional queries use `useQuery(api.fn, condition ? args : "skip")` (D085). This pattern is well-established across the native app.
- **React Native FlatList for rankings** — Leaderboard table (web uses `<table>`) should use FlatList for efficient rendering of ranked entries. Challenge standings similarly.
- **Native suffix convention** — All native competitive components go in `apps/native/src/components/competitive/` subdirectory with `Native` suffix (D067, D100).
- **No backend changes** — S04 is a pure UI port. All Convex queries/mutations already exist. Zero modifications to `packages/backend/`.

## Common Pitfalls

- **Tab bar overflow on smaller phones** — 7 tabs with labels can be cramped on iPhone SE / small Android screens. **Mitigation:** Use icon-only tabs with smaller font, or use 6 tabs by consolidating Leaderboards+Challenges into a single tab with internal segment control. Test on 320px-wide viewport.
- **Date input UX for challenge creation** — TextInput-based date entry is error-prone (users type "March 15" vs "2026-03-15"). **Mitigation:** Use clear placeholder format ("YYYY-MM-DD HH:MM"), validate on submit with descriptive errors, or add `@react-native-community/datetimepicker` if friction is too high. For MVP, a simpler approach: offer preset durations ("1 week", "2 weeks", "1 month") with start=now instead of arbitrary date ranges.
- **Challenge detail navigation vs. inline expansion** — Web uses inline expansion (D123). On mobile, inline expansion in a FlatList is awkward (no URL routing, scroll position jumps). **Mitigation:** Use stack navigator push to a ChallengeDetailScreen instead of inline expansion. This is the natural mobile pattern.
- **Exercise picker reuse friction** — ExercisePicker is tightly coupled to workout creation (adds exercise via mutation). **Mitigation:** Extract the exercise selection UI into a reusable `ExerciseSelectModal` or add an `onSelect` callback mode to the existing ExercisePicker that returns the exerciseId without mutating.
- **Leaderboard opt-in toggle missing on Profile** — Easy to forget adding the toggle since ProfileScreen doesn't currently import leaderboard APIs. **Mitigation:** Follow the web profile page integration pattern exactly — opt-in toggle between profile card and badges section.
- **Badge grid layout on narrow screens** — Web uses 3→4→5 responsive columns. RN needs explicit column count. **Mitigation:** Use 3 columns (matching smallest web breakpoint) for consistent display. Each card ~100px wide fits 3 columns on any phone viewport.

## Open Risks

- **7-tab UX quality** — Adding a 7th tab may feel crowded on smaller phones. Human UAT is required to assess whether the tab bar remains usable. If not, fallback options: (a) consolidate Templates into Workouts as a sub-screen, (b) use a "More" overflow tab, (c) nest competitive features under an existing tab.
- **Date picker dependency decision** — If TextInput date entry proves too cumbersome during implementation, adding `@react-native-community/datetimepicker` requires `npx expo install` and a native rebuild. This is a low-risk dependency addition but deviates from the "no new dependencies" preference.
- **PeriodSelector generalization** — Modifying PeriodSelector's type signature could break existing analytics callers if not done carefully. May be safer to create a new `PillSelector<T>` generic component. Decision can be made during implementation.
- **Challenge ExercisePicker decoupling** — Extracting exercise selection from the existing picker requires careful refactoring. If the picker is too coupled, a simpler ScrollView-based exercise list (without the full filter/search UI) may be faster to build for the challenge creation form.
- **TypeScript compilation** — The native app's tsconfig extends `expo/tsconfig.base` which has different module resolution than the backend. Previous mobile ports (M003/S04) encountered `EnrichedFeedItem` type inference issues (D105). New challenge/leaderboard types may need explicit interfaces.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo | `expo/skills@building-native-ui` (16.7K installs) | available — could help with native component patterns. `npx skills add expo/skills@building-native-ui` |
| React Native | `pluginagentmarketplace/custom-plugin-react-native@react-native-animations` (306 installs) | available — not needed for this port (no complex animations) |
| React Native | `react-native-community/skills@upgrade-react-native` (276 installs) | available — not relevant (not upgrading RN) |
| Convex | `get-convex/agent-skills@function-creator` (116 installs) | available — not needed (no backend changes) |
| Frontend Design | `frontend-design` | installed — use for competitive UI polish |

## Sources

- M004/S01-SUMMARY: Leaderboard backend API surface, verification patterns, data attributes
- M004/S02-SUMMARY: Challenge backend API, lifecycle state machine, all 7 public functions
- M004/S03-SUMMARY: Badge API (getUserBadges), BadgeDisplay component pattern, BADGE_DEFINITIONS constant
- D078: Mobile tab consolidation — Profile absorbed Settings, 6-tab ceiling
- D067: Native component `Native` suffix convention
- D100: Social components in `social/` subdirectory pattern
- D123: Challenge detail as inline expansion on web (different pattern needed for mobile)
- D131: Badge section placement between opt-in toggle and workout stats on profile
- Existing mobile screens: AnalyticsScreen (85 lines, simplest screen), FeedScreen (500 lines, complex FlatList), ProfileScreen (694 lines, most complex)

## Implementation Estimates

| Component | Lines (est.) | Complexity |
|-----------|-------------|------------|
| LeaderboardScreenNative | ~350 | Medium — exercise selector, 3 pill pickers, ranked FlatList, My Rank card |
| ChallengesScreenNative | ~400 | Medium — status pills, challenge list, create form with exercise picker |
| ChallengeDetailScreenNative | ~300 | Medium — standings FlatList, action buttons, winner display |
| BadgeDisplayNative | ~130 | Low — self-contained query + grid, loading/empty/populated states |
| LeaderboardOptInToggle (in ProfileScreen) | ~40 | Low — toggle + mutation, same pattern as web |
| CompeteStack in MainTabs.tsx | ~50 | Low — new stack navigator + tab icon |
| ProfileScreen modifications | ~30 | Low — import + render BadgeDisplayNative + opt-in toggle |
| OtherProfileScreen modifications | ~15 | Low — import + render BadgeDisplayNative |
| PillSelector generic component | ~80 | Low — generalize PeriodSelector for string values |
| **Total** | **~1395** | **Moderate overall** |
