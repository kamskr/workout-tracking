---
id: T03
parent: S02
milestone: M002
provides:
  - Exercise detail page at /exercises/[id] with chart, PRs, info, and time period selector
  - ExerciseCard navigation link to exercise detail page
key_files:
  - apps/web/src/app/exercises/[id]/page.tsx
  - apps/web/src/components/exercises/ExerciseCard.tsx
key_decisions:
  - Badge colors and formatLabel duplicated in detail page rather than extracting a shared module — ExerciseCard is a leaf component with no shared export surface; extraction deferred until a third consumer appears
  - PRSummary displays weight and volume PRs using formatWeight with user's unit preference; reps shown as plain count
patterns_established:
  - Time period selector pattern: pill buttons with PeriodDays state (30|90|180|365|undefined), passed as periodDays prop to chart components
  - Exercise detail page follows same max-w-5xl/gray-50 layout pattern as exercises list page
observability_surfaces:
  - data-exercise-chart attribute inherited from ExerciseProgressChart (T02) for programmatic chart detection
  - Loading, not-found, and empty states each render distinct UI — inspectable via browser accessibility tree
duration: ~15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Exercise detail page + ExerciseCard navigation link

**Built exercise detail page at `/exercises/[id]` with progress chart, PR cards, time period selector, and exercise info — wired ExerciseCard to link to it from the library.**

## What Happened

Created the exercise detail page that closes the S02 integration loop. The page fetches exercise details via `getExercise`, personal records via `getPersonalRecords`, and user preferences via `getPreferences`. It renders:

1. Back link to `/exercises`
2. Exercise name heading with muscle group, equipment, and type badges
3. Instructions section (conditionally shown)
4. Personal Records section — 3 stat cards (Best Estimated 1RM, Best Session Volume, Best Single Set Reps) with formatted values using the user's weight unit preference, or "No personal records yet" fallback
5. Time period selector — pill buttons for 30d, 90d, 6mo, 1yr, All Time (default All Time)
6. ExerciseProgressChart component receiving the selected `periodDays`

Added a `Link` wrapper to ExerciseCard pointing to `/exercises/${exercise._id}`. Confirmed ExercisePicker has its own inline rendering and does not use ExerciseCard — the Link addition is safe.

Loading and not-found states are handled: loading shows a centered spinner, not-found shows an explicit message with a back link.

## Verification

- `pnpm turbo typecheck --force` — **0 errors** across all 3 packages (web, native, backend) ✅
- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — **8/8 pass** ✅
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — **12/12 pass** ✅
- `npx tsx packages/backend/scripts/verify-s02.ts` — **15/15 pass** ✅
- Exercise detail page file exists at `apps/web/src/app/exercises/[id]/page.tsx` ✅
- ExerciseCard.tsx contains `Link` import and `href` to `/exercises/` ✅
- ExercisePicker does NOT use ExerciseCard (grep confirms only ExerciseList imports it) ✅

## Diagnostics

- Navigate to `/exercises/[id]` in browser to see the full detail page
- `document.querySelectorAll('[data-exercise-chart]')` detects chart presence
- Loading state: spinner shown while queries resolve; not-found: explicit message when exercise is null
- PR section shows "No personal records yet" when no PRs exist for the exercise
- Period selector state is local — changing periods triggers reactive chart re-fetch via Convex subscription

## Deviations

None — implemented as planned.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/app/exercises/[id]/page.tsx` — **new** — exercise detail page with chart, PRs, info, time period selector, loading/not-found states
- `apps/web/src/components/exercises/ExerciseCard.tsx` — **modified** — added Link import and wrapper to `/exercises/${exercise._id}`
