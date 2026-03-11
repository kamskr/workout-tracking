---
estimated_steps: 5
estimated_files: 4
---

# T03: Exercise detail page + ExerciseCard navigation link

**Slice:** S02 — Progress Charts Per Exercise
**Milestone:** M002

## Description

Create the exercise detail page at `/exercises/[id]` and wire ExerciseCard to link to it. This task closes the integration loop — users navigate from the exercise library → exercise detail → see their progress chart + PRs + exercise info. The page consumes all S02 backend + component outputs (T01 query, T02 chart) and composes them into the user-facing surface.

## Steps

1. **Create `apps/web/src/app/exercises/[id]/page.tsx`** — `"use client"` page:
   - Use `useParams()` from `next/navigation` to extract `id` param
   - Cast `id` to `Id<"exercises">` (with validation — redirect or show 404 if missing)
   - Fetch exercise details via `useQuery(api.exercises.getExercise, { id })`
   - Fetch PR records via `useQuery(api.personalRecords.getPersonalRecords, { exerciseId: id })`
   - Use `useQuery(api.userPreferences.getPreferences)` for weight unit display (or check existing pattern — may need to query `userPreferences` table)
   - Layout (follows existing `max-w-5xl` / `gray-50` pattern from exercises list page):
     - Back link to `/exercises` at top
     - Exercise name as page heading
     - Badges for muscle group, equipment, exercise type (reuse Badge pattern from ExerciseCard)
     - Instructions section (if exercise has instructions)
     - PR section: display current bests (weight PR, volume PR, rep PR) as small stat cards
     - Time period selector: pill buttons for "30d", "90d", "6mo", "1yr", "All Time" (default "All Time"). Store selected period in local state, pass as `periodDays` to chart.
     - `ExerciseProgressChart` component with selected `periodDays`
   - Handle loading state (exercise data undefined)
   - Handle exercise not found (null exercise after query resolves)

2. **Build the time period selector UI**:
   - Define periods: `[{ label: "30d", days: 30 }, { label: "90d", days: 90 }, { label: "6mo", days: 180 }, { label: "1yr", days: 365 }, { label: "All Time", days: undefined }]`
   - Render as a row of pill buttons with active state styling
   - Default to "All Time" (undefined)
   - `periodDays` state passed to `ExerciseProgressChart`

3. **Build the PR summary section**:
   - Map PR types to display labels: weight → "Best Estimated 1RM", volume → "Best Session Volume", reps → "Best Single Set Reps"
   - Show each PR as a small card with type label, formatted value (weight PRs use `formatWeight` with user unit), and date achieved
   - If no PRs exist, show "No personal records yet"

4. **Add Link wrapper to ExerciseCard**:
   - Import `Link` from `next/link` in `ExerciseCard.tsx`
   - Wrap the existing card `div` in `<Link href={/exercises/${exercise._id}} className="block">`
   - Confirm ExercisePicker does NOT use ExerciseCard (verified in research — it has its own inline rendering). The Link wrapper is safe.
   - The card already has hover styles (`hover:border-gray-300 hover:shadow-md`) which work well as link affordance

5. **Verify everything works together**:
   - `pnpm turbo typecheck --force` — 0 errors
   - All existing verify scripts pass (no regression)
   - `npx tsx packages/backend/scripts/verify-s02-m02.ts` — still 8/8

## Must-Haves

- [ ] Exercise detail page at `/exercises/[id]` renders exercise info, PRs, and chart
- [ ] Time period selector with 30d, 90d, 6mo, 1yr, All Time options
- [ ] PR records displayed on detail page with formatted values
- [ ] ExerciseCard wraps in Link to `/exercises/[id]`
- [ ] ExercisePicker is NOT affected by the Link change
- [ ] Back navigation from detail page to `/exercises`
- [ ] Loading and not-found states handled
- [ ] TypeScript compiles with 0 errors across all packages
- [ ] All verification scripts pass (no regression)

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 pass
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — 12/12 pass (regression check)
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 pass (M001 regression check)
- Exercise detail page file exists at `apps/web/src/app/exercises/[id]/page.tsx`
- ExerciseCard.tsx contains `Link` import and `href` to `/exercises/`

## Observability Impact

- Signals added/changed: None new — composes existing signals (`data-exercise-chart` from T02, query subscriptions from T01)
- How a future agent inspects this: Navigate to `/exercises/[id]` in browser. Check for `[data-exercise-chart]` selector. Inspect `useQuery` subscriptions in React DevTools.
- Failure state exposed: Exercise not found renders explicit message. Chart empty state renders when < 2 data points. Auth redirect handled by existing Clerk middleware (route matches `/exercises(.*)` pattern — already protected).

## Inputs

- `packages/backend/convex/analytics.ts` → `getExerciseProgress` query (T01)
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` → chart component (T02)
- `packages/backend/convex/personalRecords.ts` → `getPersonalRecords` query (S01)
- `packages/backend/convex/exercises.ts` → `getExercise` query (M001)
- `apps/web/src/components/exercises/ExerciseCard.tsx` → existing card to add Link
- `apps/web/src/app/exercises/page.tsx` → layout pattern reference
- `apps/web/src/lib/units.ts` → `formatWeight` for PR value display

## Expected Output

- `apps/web/src/app/exercises/[id]/page.tsx` — **new** — exercise detail page with chart, PRs, info, time period selector
- `apps/web/src/components/exercises/ExerciseCard.tsx` — **modified** — Link wrapper added
- All verification scripts passing (no regression)
