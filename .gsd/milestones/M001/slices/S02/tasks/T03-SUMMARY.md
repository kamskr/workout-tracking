---
id: T03
parent: S02
milestone: M001
provides:
  - Unit conversion utility (kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration)
  - Workout history page at /workouts with loading/empty/populated states
  - WorkoutCard component with delete functionality
  - WeightUnit type for cross-component use
key_files:
  - apps/web/src/lib/units.ts
  - apps/web/src/components/workouts/WorkoutCard.tsx
  - apps/web/src/components/workouts/WorkoutHistory.tsx
  - apps/web/src/app/workouts/page.tsx
key_decisions:
  - WorkoutCard self-fetches exercise count via useQuery(listExercisesForWorkout) rather than parent passing it — avoids N+1 prop drilling, Convex handles reactive subscriptions efficiently
patterns_established:
  - Workout component directory at src/components/workouts/ following exercises/ pattern
  - Unit conversion as pure functions in src/lib/units.ts — testable in isolation, imported by any component
  - WorkoutCard delete with window.confirm() before mutation — simple confirmation pattern
observability_surfaces:
  - Navigate to /workouts in browser to check loading/empty/populated states
  - Unit conversion is pure functions — testable via `npx tsx -e "require('./apps/web/src/lib/units')"` or import in any script
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Unit conversion utility and workout history page

**Built unit conversion library and workout history page with loading/empty states, workout cards with delete, and /workouts route.**

## What Happened

Created 4 files implementing the unit conversion utility and workout history UI:

1. **`apps/web/src/lib/units.ts`** — Pure function module with `kgToLbs` (rounds to 1 decimal), `lbsToKg` (no rounding for storage precision), `formatWeight` ("60 kg" / "132.3 lbs"), `displayWeight` (numeric for input fields), `formatDuration` ("1h 23m" / "45m" / "0m"), and `WeightUnit` type. All edge cases handled (0 seconds, negative, hours+minutes).

2. **`apps/web/src/components/workouts/WorkoutCard.tsx`** — Card component following ExerciseCard styling (rounded-xl border, hover shadow). Displays workout name (defaults to "Workout"), formatted date, duration badge, status badge (for in-progress), exercise count badge. Self-fetches exercise count via `useQuery(api.workoutExercises.listExercisesForWorkout)`. Delete button with `window.confirm()` before calling `deleteWorkout` mutation (cascade deletes exercises + sets).

3. **`apps/web/src/components/workouts/WorkoutHistory.tsx`** — List component using `useQuery(api.workouts.listWorkouts)` and `useQuery(api.userPreferences.getPreferences)`. Three states: loading spinner (matching ExerciseList pattern), empty state with clock icon and "Start Workout" CTA, and populated grid of WorkoutCards. "Start Workout" button at top links to `/workouts/active`.

4. **`apps/web/src/app/workouts/page.tsx`** — Route page following exercises/page.tsx layout (max-w-5xl, px-4, py-8). Page title "Workout History" with description subtitle.

## Verification

- **`pnpm turbo typecheck`** — All 3 packages compile cleanly (web-app, backend, native-app). ✅
- **Unit conversion programmatic test** — Verified all functions via `npx tsx -e`:
  - `formatWeight(60, "kg")` → "60 kg" ✅
  - `formatWeight(60, "lbs")` → "132.3 lbs" ✅
  - `lbsToKg(132.3)` → 60.0103... (NOT rounded) ✅
  - `formatDuration(0)` → "0m" ✅
  - `formatDuration(4980)` → "1h 23m" ✅
  - `formatDuration(3600)` → "1h 0m" ✅
  - `formatDuration(-5)` → "0m" ✅
- **Route protection** — Browser navigation to `/workouts` redirects to Clerk sign-in. ✅
- **Full browser flow** — Could not complete authenticated browser test due to Cloudflare captcha on Clerk dev sign-in. Typecheck confirms all Convex API bindings are correct (useQuery hooks are type-checked against actual API).

### Slice-level verification status (intermediate task — partial passes expected):
- `npx tsx packages/backend/scripts/verify-s02.ts` — **not re-run** (backend functions unchanged from T02)
- `pnpm turbo typecheck` — **PASS** ✅
- Browser: `/workouts` shows workout history — **PARTIAL** (route exists, protected, renders; full auth flow blocked by captcha)
- Browser: `/workouts/active` — **not yet** (T04 scope)
- Browser: finishing workout redirects to history — **not yet** (T04 scope)
- Browser: unit toggle switches weight display — **not yet** (T04 scope)

## Diagnostics

- Navigate to `/workouts` in browser — observe loading spinner → empty state or workout list
- Unit conversion is pure: import and call in any script or test
- Delete mutation throws structured errors for auth/ownership failures (from T01 backend)
- Convex reactive queries surface connection errors via existing ErrorBoundary

## Deviations

- WorkoutCard fetches its own exercise count via `useQuery` instead of receiving it as a prop — cleaner component boundary, Convex handles subscriptions efficiently
- `preferences` query result is fetched in WorkoutHistory but not yet passed to WorkoutCard (weight display is not shown on history cards — only duration and exercise count). Weight formatting will be used in T04's SetRow component.

## Known Issues

- Browser-based authenticated testing blocked by Cloudflare captcha on Clerk dev sign-in — all type safety confirmed via typecheck instead
- `formatDuration` shows "0m" for durations under 60 seconds (acceptable per task plan spec)

## Files Created/Modified

- `apps/web/src/lib/units.ts` — Unit conversion utility (kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration, WeightUnit type)
- `apps/web/src/components/workouts/WorkoutCard.tsx` — Workout summary card with date, duration, exercise count, and delete button
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — Workout history list with loading/empty/populated states
- `apps/web/src/app/workouts/page.tsx` — /workouts route page
