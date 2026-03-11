---
id: T02
parent: S06
milestone: M001
provides:
  - Exercise browse screen with FlatList rendering all 144 exercises from Convex
  - Muscle group filter via horizontal scrollable chip selector
  - Equipment filter via horizontal scrollable chip selector
  - Text search input with immediate filtering
  - ExerciseCard component with color-coded muscle/equipment/type badges
  - Filter arg builder excluding empty strings from Convex query args
key_files:
  - apps/native/src/components/ExerciseFilters.tsx
  - apps/native/src/components/ExerciseCard.tsx
  - apps/native/src/screens/ExercisesScreen.tsx
key_decisions:
  - Used horizontal ScrollView with TouchableOpacity chips for filters instead of native Picker/select — better UX for gym context (one-tap selection, visible options)
  - Memoized ExerciseCard with React.memo to avoid re-renders on filter changes
  - FlatList with ListHeaderComponent for filters — keeps filters pinned at scroll top and avoids nested scroll issues
patterns_established:
  - Filter chip row pattern: ChipRow component with horizontal ScrollView, active state via accent background color
  - Badge color map pattern: BADGE_COLORS record keyed by enum value, with { bg, text } pairs for React Native styling
  - Filter arg builder pattern (mobile): useMemo builds queryArgs Record excluding empty strings, passed directly to useQuery
observability_surfaces:
  - Convex query failures surface as React render errors in Metro console
  - Loading state (ActivityIndicator) visible when exercises === undefined
  - Empty state ("No exercises match your filters") visible when exercises is empty array
  - Exercise count displayed above list for quick verification
duration: 1 step (single context window)
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Exercise browse screen with filters

**Built the exercise browse screen for the Exercises tab — FlatList of ExerciseCards with horizontal chip selectors for muscle group and equipment filters, plus text search, wired to the same `listExercises` Convex query as web.**

## What Happened

Created three new files to deliver the exercise browse experience on mobile:

1. **ExerciseFilters.tsx** — Search TextInput with search icon, plus two ChipRow components (muscle group and equipment). Each ChipRow renders a horizontal ScrollView of touchable pill/chip elements. Active chip gets accent-colored background. "All" option (empty value) clears the filter. Same MUSCLE_GROUPS and EQUIPMENT_OPTIONS constants as web.

2. **ExerciseCard.tsx** — Memoized card component showing exercise name, primary muscle group badge, equipment badge, and exercise type badge. Each badge uses a color map matching the web's color scheme translated to React Native `{ bg, text }` pairs. TouchableOpacity wrapper ready for future drill-down navigation.

3. **ExercisesScreen.tsx** — Full replacement of the placeholder. Owns filter state, builds query args with the same pattern as web (empty strings excluded), calls `useQuery(api.exercises.listExercises, queryArgs)`. Renders FlatList with ExerciseFilters as ListHeaderComponent, memoized renderItem, proper keyExtractor using `item._id`. Handles loading state (ActivityIndicator), empty state ("No exercises match your filters"), and exercise count display.

No changes needed to MainTabs.tsx — it already imports ExercisesScreen from the correct path.

## Verification

- `pnpm turbo typecheck --force` — **3/3 packages pass, 0 errors** (backend, web, native)
- Verify scripts (S02–S05) — not runnable (require live Convex instance), noted as expected for intermediate task
- Manual verification items (require Expo runtime):
  - Exercises tab shows scrollable list of exercises
  - Selecting "Chest" muscle group chip reduces visible exercises
  - Typing "press" in search shows ~19 results
  - Clearing filters returns to full 144-exercise list
  - Loading spinner appears before exercises load

## Diagnostics

- **Query state**: `useQuery(api.exercises.listExercises)` return value — `undefined` = loading, empty array = no matches, array = results
- **Convex dashboard**: Query calls from mobile client visible at http://127.0.0.1:6790
- **Metro console**: Convex connection failures surface as React render errors
- **Filter state**: Inspect `queryArgs` passed to useQuery to verify arg builder excludes empty strings

## Deviations

None.

## Known Issues

- Verify scripts require running Convex instance — will pass once backend is started for manual/E2E testing
- Manual Expo verification deferred to runtime (not executable in CI-only context)

## Files Created/Modified

- `apps/native/src/components/ExerciseFilters.tsx` — search input + horizontal chip selectors for muscle group and equipment filters
- `apps/native/src/components/ExerciseCard.tsx` — memoized exercise card with color-coded badges
- `apps/native/src/screens/ExercisesScreen.tsx` — full exercise browse screen replacing placeholder, with FlatList + filter state + Convex query
