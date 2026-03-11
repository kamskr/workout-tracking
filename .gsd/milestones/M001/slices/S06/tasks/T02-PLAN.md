---
estimated_steps: 4
estimated_files: 4
---

# T02: Exercise browse screen with filters

**Slice:** S06 — Mobile App & Cross-Platform Polish
**Milestone:** M001

## Description

Build the exercise browse screen for the Exercises tab — a FlatList of exercise cards with muscle group filter, equipment filter, and name search. Directly ports the web's ExerciseList/ExerciseFilters/ExerciseCard pattern to React Native, wired to the same `listExercises` Convex query. This delivers R001 (exercise library browsable on mobile) and R010 (filter by muscle group and equipment on mobile).

## Steps

1. Create `apps/native/src/components/ExerciseFilters.tsx` — search TextInput at top, followed by filter row. For muscle group and equipment filters, use a custom scrollable chip/pill selector (horizontal ScrollView with touchable chips) rather than HTML `<select>` or RN Picker. Include the same `MUSCLE_GROUPS` and `EQUIPMENT_OPTIONS` constant arrays as web. "All" option clears filter. Search uses `onChangeText` with debounce or direct state. Emit filter changes via callback props.

2. Create `apps/native/src/components/ExerciseCard.tsx` — card showing exercise name, primary muscle group badge (colored), equipment badge, and exercise type. Use `TouchableOpacity` for potential future drill-down. Style per D007: clean white card, subtle border, rounded corners, badge colors matching web.

3. Replace placeholder `apps/native/src/screens/ExercisesScreen.tsx` with full implementation — owns filter state (search, primaryMuscleGroup, equipment), calls `useQuery(api.exercises.listExercises, filterArgs)` with the same arg-builder pattern as web (empty strings excluded from args). Renders ExerciseFilters at top and FlatList of ExerciseCards. FlatList must use `keyExtractor={(item) => item._id}` and memoized `renderItem`. Include loading state (ActivityIndicator) and empty state ("No exercises match your filters"). Handle `undefined` query result (loading) vs empty array (no matches).

4. Wire ExercisesScreen into the Exercises tab stack navigator in MainTabs (replace the placeholder import). Verify 144 exercises render, filters narrow results, search works.

## Must-Haves

- [ ] ExercisesScreen renders 144 exercises from Convex in a FlatList
- [ ] Muscle group filter narrows results (e.g., chest → ~16 results)
- [ ] Equipment filter narrows results (e.g., barbell → ~30 results)
- [ ] Text search narrows results (e.g., "press" → ~19 results)
- [ ] Loading state with ActivityIndicator while query resolves
- [ ] Empty state when no exercises match filters
- [ ] ExerciseCard shows name, muscle group badge, equipment badge
- [ ] Filter arg builder excludes empty strings from Convex query args
- [ ] `pnpm turbo typecheck --force` passes

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- Exercises tab shows scrollable list of exercises (manual Expo check)
- Selecting "Chest" muscle group filter reduces visible exercises
- Typing "press" in search shows ~19 results
- Clearing filters returns to full 144-exercise list
- Loading spinner appears briefly before exercises load

## Observability Impact

- Signals added/changed: None — uses existing `listExercises` Convex query. Any query failure surfaces as React render error in Metro console.
- How a future agent inspects this: Check `useQuery(api.exercises.listExercises)` return value. Convex dashboard shows query calls from mobile client.
- Failure state exposed: `undefined` query result → loading state. Empty array → "No exercises match" message. Convex connection failure → error boundary or render error in Metro.

## Inputs

- `apps/native/src/screens/ExercisesScreen.tsx` — placeholder from T01 (to be replaced)
- `apps/native/src/navigation/MainTabs.tsx` — tab navigator from T01 (import update)
- `apps/native/src/lib/theme.ts` — color constants from T01
- `apps/web/src/components/exercises/ExerciseList.tsx` — web pattern reference for filter arg builder
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — web pattern reference for filter constants (MUSCLE_GROUPS, EQUIPMENT_OPTIONS)
- `apps/web/src/components/exercises/ExerciseCard.tsx` — web pattern reference for card layout
- S01 summary: `listExercises` uses dual-path (search index + regular index), 144 exercises seeded

## Expected Output

- `apps/native/src/components/ExerciseFilters.tsx` — filter chips + search input
- `apps/native/src/components/ExerciseCard.tsx` — exercise display card with badges
- `apps/native/src/screens/ExercisesScreen.tsx` — full exercise browse screen with FlatList + filters
- `apps/native/src/navigation/MainTabs.tsx` — updated import for real ExercisesScreen
