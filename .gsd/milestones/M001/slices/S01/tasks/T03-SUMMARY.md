---
id: T03
parent: S01
milestone: M001
provides:
  - Exercise browse page at /exercises with filter dropdowns, search input, and card-based grid
  - Clerk-protected /exercises and /workouts routes in middleware
  - Updated app metadata from "Notes App" to "Workout Tracker"
key_files:
  - apps/web/src/app/exercises/page.tsx
  - apps/web/src/components/exercises/ExerciseList.tsx
  - apps/web/src/components/exercises/ExerciseFilters.tsx
  - apps/web/src/components/exercises/ExerciseCard.tsx
  - apps/web/src/middleware.ts
  - apps/web/src/app/layout.tsx
key_decisions:
  - Lifted filter state to ExerciseList component — filters/search state managed in one place, passed as query args to useQuery and as props to ExerciseFilters
  - ExerciseList builds Convex query args dynamically, omitting empty string values so Convex receives only active filters
  - Used native HTML select elements for filters (no headless UI dependency) — matches clean/minimal design language
patterns_established:
  - Exercise component folder at src/components/exercises/ — future exercise-related components go here
  - Query-arg builder pattern — empty string filter values are excluded from the Convex query args object
  - Badge color mapping via BADGE_COLORS record keyed by enum value — reusable for future exercise displays
observability_surfaces:
  - Browser console surfaces React/Convex errors; Convex dashboard shows query execution with filter args
  - Loading spinner visible while Convex query resolves; empty state with contextual message when no results match
duration: 1 session
verification_result: partial
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build exercise browse page with filters, search, and route protection

**Built exercise library page at `/exercises` with muscle group/equipment filter dropdowns, name search, card grid, loading/empty states, and Clerk route protection for `/exercises` and `/workouts`.**

## What Happened

Created four new components and updated two existing files:

1. **Middleware** — Added `/exercises(.*)` and `/workouts(.*)` to the Clerk `createRouteMatcher` protected routes array alongside `/notes(.*)`.

2. **ExerciseFilters** — Client component with search input (with search icon), muscle group `<select>`, and equipment `<select>`. Lifts filter state via props. Uses the exact enum values from the Convex schema (chest, back, shoulders, biceps, triceps, legs, core, fullBody, cardio for muscle groups; barbell, dumbbell, cable, machine, bodyweight, kettlebell, bands, other for equipment).

3. **ExerciseCard** — Display card showing exercise name (prominent, with hover color transition), plus badges for primary muscle group, equipment, and exercise type. Badge colors are mapped per enum value for visual distinction. Uses `cn()` helper.

4. **ExerciseList** — Composition component that owns filter state, builds Convex query args (omitting empty values), calls `useQuery(api.exercises.listExercises, queryArgs)`, and renders ExerciseFilters + ExerciseCard grid. Handles loading (spinner), empty (contextual message), and results (count + grid) states.

5. **Page** — `/exercises` route as a `"use client"` page composing ExerciseList with page title and description.

6. **Layout metadata** — Updated from "Notes App"/"This is an app to take notes." to "Workout Tracker"/"Track your workouts, browse exercises, and monitor your fitness progress."

## Verification

### Passed
- `pnpm turbo typecheck --filter=web-app` — compiles cleanly, no errors
- Route protection: navigating to `/exercises` unauthenticated → redirected to Clerk sign-in page (verified in browser)
- Convex queries via CLI — all filter paths work:
  - `listExercises '{"primaryMuscleGroup":"chest"}'` → 16 results (correct chest exercises)
  - `listExercises '{"primaryMuscleGroup":"chest","equipment":"barbell"}'` → 3 results (combined filter narrows correctly)
  - `listExercises '{"searchQuery":"bench"}'` → 6 results (text search returns correct exercises)
- Layout metadata updated — browser title shows "Workout Tracker"

### Not verified (requires signed-in browser session)
- Browser: exercises render in card grid while signed in
- Browser: muscle group dropdown filters live
- Browser: equipment dropdown filters live
- Browser: search input triggers text search live
- Browser: combined filters narrow results
- Browser: clear all filters returns full list
- Browser: no console errors during interactions

The signed-in browser verification was blocked by Cloudflare Turnstile captcha on the Clerk sign-up/sign-in flow which cannot be automated. All Convex query logic was verified via CLI. Component structure and types were verified via typecheck.

## Diagnostics

- **Page structure**: Browser accessibility tree at `/exercises` shows component hierarchy
- **Convex queries**: Dashboard shows `listExercises` execution with filter args — inspect for performance
- **Filter behavior**: Query args are logged in Convex function logs (visible in dashboard)
- **Loading/empty states**: Visible in browser when Convex query is resolving or returns zero results
- **React errors**: Surface in browser console

## Deviations

- Added `apps/web/.env.local` with `NEXT_PUBLIC_CONVEX_URL` and Clerk keys to enable local development — these were missing (pre-existing gap, not created by this task)
- Created `.env.test` with test credentials for browser automation — ephemeral, not committed

## Known Issues

- Full browser verification of the signed-in exercise page flow was not completed due to Cloudflare Turnstile captcha blocking automated sign-in. Manual verification needed for the live filtering UI.
- The `.env.local` file with Clerk keys is gitignored and must be recreated per-developer

## Files Created/Modified

- `apps/web/src/app/exercises/page.tsx` — Exercise library route page with title and ExerciseList composition
- `apps/web/src/components/exercises/ExerciseList.tsx` — Main composition component with filter state, Convex query, loading/empty/results states
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — Filter dropdowns (muscle group, equipment) and search input with lifted state pattern
- `apps/web/src/components/exercises/ExerciseCard.tsx` — Exercise display card with name, colored badges for muscle group/equipment/type
- `apps/web/src/middleware.ts` — Added `/exercises(.*)` and `/workouts(.*)` to Clerk protected routes
- `apps/web/src/app/layout.tsx` — Updated metadata from "Notes App" to "Workout Tracker"
