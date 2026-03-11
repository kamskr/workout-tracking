---
estimated_steps: 5
estimated_files: 7
---

# T03: Build exercise browse page with filters, search, and route protection

**Slice:** S01 — Convex Schema & Exercise Library
**Milestone:** M001

## Description

Build the user-facing exercise library page at `/exercises` on the web app. This is a client component that subscribes to Convex queries for realtime data. Includes filter dropdowns for muscle group and equipment, a search input for name search, and a card-based exercise list. Route is protected via Clerk middleware. Follows the clean/minimal design language (D007) using the existing Tailwind 4 theme and CVA component patterns.

## Steps

1. Update `apps/web/src/middleware.ts` — add `/exercises(.*)` and `/workouts(.*)` to the `createRouteMatcher` protected routes array alongside existing `/notes(.*)`.

2. Create `apps/web/src/components/exercises/ExerciseFilters.tsx` — client component with:
   - Muscle group `<select>` dropdown with "All Muscle Groups" default + enum options (Chest, Back, Shoulders, Biceps, Triceps, Legs, Core, Full Body, Cardio)
   - Equipment `<select>` dropdown with "All Equipment" default + enum options (Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Bands, Other)
   - Search text input with placeholder "Search exercises..."
   - Props: `filters` state object + `onFiltersChange` callback — lifted state pattern so the parent controls the query args
   - Clean/minimal styling: subtle borders, rounded inputs, consistent spacing, light backgrounds

3. Create `apps/web/src/components/exercises/ExerciseCard.tsx` — display component showing:
   - Exercise name (prominent)
   - Primary muscle group badge
   - Equipment badge
   - Exercise type badge
   - Compact card layout with clean borders and hover state
   - Uses `cn()` helper and follows CVA patterns from `button.tsx`

4. Create `apps/web/src/components/exercises/ExerciseList.tsx` — composition component:
   - Accepts exercises array from Convex query
   - Renders `ExerciseFilters` at top, grid of `ExerciseCard` below
   - Handles loading state (Convex `useQuery` returns `undefined` while loading)
   - Handles empty state ("No exercises found" with current filter description)
   - Manages filter state and passes as query args to the parent

5. Create `apps/web/src/app/exercises/page.tsx` — the route page:
   - `"use client"` directive
   - Uses `useQuery(api.exercises.listExercises, filterArgs)` with reactive filter state
   - Composes `ExerciseList` with Convex query results
   - Page title "Exercise Library"
   - Update `apps/web/src/app/layout.tsx` metadata to reflect workout app (not notes app)

## Must-Haves

- [ ] `/exercises` route is Clerk-protected — unauthenticated users redirected to sign-in
- [ ] `/workouts` route is also protected (forward-looking for S02)
- [ ] Exercise list renders from live Convex query (not hardcoded data)
- [ ] Muscle group dropdown filters exercises by `primaryMuscleGroup`
- [ ] Equipment dropdown filters exercises by `equipment`
- [ ] Search input triggers text search on exercise name
- [ ] Filters combine — selecting muscle group + equipment narrows results
- [ ] Loading state shown while Convex query resolves
- [ ] Empty state shown when no exercises match filters
- [ ] Design follows clean/minimal language (D007): light theme, subtle colors, generous whitespace
- [ ] Layout metadata updated from "Notes App" to workout app branding

## Verification

- `pnpm turbo typecheck` passes for `web-app` package
- Browser: navigate to `/exercises` while signed in — exercises render
- Browser: select "Chest" in muscle group filter — only chest exercises shown
- Browser: select "Barbell" in equipment filter — only barbell exercises shown
- Browser: type "bench" in search — only exercises with "bench" in name shown
- Browser: combine muscle group + equipment filters — results narrow correctly
- Browser: clear all filters — full list returns
- Browser: navigate to `/exercises` while signed out — redirected to Clerk sign-in
- No console errors in browser during all interactions

## Observability Impact

- Signals added/changed: None (client-side UI only, Convex query subscriptions handle data flow)
- How a future agent inspects this: Browser accessibility tree and network logs show Convex query calls; page source shows component structure; Convex dashboard shows query execution with args
- Failure state exposed: Loading state is visible while queries resolve; empty state shows when no results match; browser console surfaces any React/Convex errors

## Inputs

- `packages/backend/convex/exercises.ts` — `listExercises` and `getExercise` query functions from T02
- `packages/backend/convex/_generated/api` — generated API types for `useQuery`
- `apps/web/src/middleware.ts` — existing Clerk middleware to extend
- `apps/web/src/components/common/button.tsx` — CVA + Radix pattern to follow
- `apps/web/src/lib/utils.ts` — `cn()` helper
- `apps/web/src/app/globals.css` — Tailwind 4 theme tokens

## Expected Output

- `apps/web/src/app/exercises/page.tsx` — exercise library route page
- `apps/web/src/components/exercises/ExerciseList.tsx` — composition component
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — filter dropdowns + search
- `apps/web/src/components/exercises/ExerciseCard.tsx` — exercise display card
- `apps/web/src/middleware.ts` — updated with exercise + workout route protection
- `apps/web/src/app/layout.tsx` — updated metadata
