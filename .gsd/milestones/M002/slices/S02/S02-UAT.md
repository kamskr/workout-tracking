# S02: Progress Charts Per Exercise — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven backend verification + live-runtime chart rendering)
- Why this mode is sufficient: Backend data accuracy is fully proven by 8/8 automated checks. Chart rendering, axis readability, tooltip UX, and time period selector interaction require human visual inspection in a live browser session.

## Preconditions

- Convex dev backend running (`cd packages/backend && npx convex dev`)
- Next.js dev server running (`cd apps/web && pnpm dev`)
- At least one user account with 3+ completed workouts containing various exercises with different weights/reps
- User logged in via Clerk on web

## Smoke Test

Navigate to `/exercises`, click any exercise card → exercise detail page loads showing the exercise name, PR section, time period pills, and either a progress chart (if workouts exist) or an empty state message.

## Test Cases

### 1. Exercise detail page loads with chart data

1. Navigate to `/exercises`
2. Click an exercise card for an exercise you've performed in multiple workouts (e.g., Bench Press)
3. **Expected:** Exercise detail page at `/exercises/[id]` shows:
   - Exercise name as heading
   - Muscle group, equipment, and type badges
   - Personal Records section with stat cards (or "No personal records yet")
   - Time period selector pills (30d, 90d, 6mo, 1yr, All Time — All Time selected by default)
   - A line chart with 3 colored lines: Max Weight (blue), Est. 1RM (teal), Total Volume (amber)
   - Dual Y-axes: left labeled "kg", right labeled "volume"

### 2. Chart tooltip shows correct values

1. On the chart, hover over any data point
2. **Expected:** Tooltip appears showing:
   - Full date (e.g., "Mar 5, 2026")
   - Max Weight value in kg
   - Est. 1RM value in kg (may be absent for high-rep-only sessions)
   - Total Volume value

### 3. Time period selector filters chart data

1. On the exercise detail page with chart data, click "30d" pill
2. **Expected:** Chart updates to show only data points from the last 30 days. Line may have fewer points or show empty state if no workouts in that period.
3. Click "All Time" pill
4. **Expected:** Chart returns to showing all historical data points

### 4. ExerciseCard navigation works

1. Navigate to `/exercises`
2. Click any exercise card
3. **Expected:** Navigates to `/exercises/[id]` — the exercise detail page
4. Click the "← Back to Exercises" link at the top
5. **Expected:** Returns to `/exercises` library page

### 5. Empty state for unperformed exercise

1. Navigate to `/exercises`
2. Find and click an exercise you have never performed in any workout
3. **Expected:** Exercise detail page shows:
   - Exercise info (name, badges)
   - "No personal records yet" in the PR section
   - Empty state message in the chart area: "Log more workouts with this exercise to see progress charts" (or similar)
   - No chart lines rendered

## Edge Cases

### Exercise with exactly 1 workout

1. Find an exercise performed in exactly 1 workout
2. Navigate to its detail page
3. **Expected:** Empty state shown (chart requires ≥2 data points). The single data point is not enough to show a trend line.

### Rapidly switching time periods

1. On an exercise detail page with chart data
2. Quickly click through 30d → 90d → 6mo → 1yr → All Time
3. **Expected:** Chart updates reactively each time without errors or stale data. No console errors.

### Exercise with very high volume numbers

1. If available, check an exercise where total volume exceeds 1000 kg
2. **Expected:** Right Y-axis uses compact formatting (e.g., "1.2k") and chart lines remain distinguishable

## Failure Signals

- Chart area shows a loading spinner indefinitely (query failure or Convex connection issue)
- Chart renders but lines are flat at zero (data aggregation bug)
- Tooltip shows NaN or undefined values (edge case in volume/1RM calculation)
- Clicking ExerciseCard does not navigate (Link wrapper missing or broken)
- Console errors related to Recharts rendering or undefined data
- Time period selector pills don't visually highlight the active selection
- Exercise detail page shows 404 or blank content

## Requirements Proved By This UAT

- R013 (Progress Charts Per Exercise) — this UAT proves:
  - Users can view line charts showing weight, volume, and estimated 1RM progression for any exercise
  - Chart data is accurate (backend verified by 8/8 automated checks)
  - Time period filtering works (30d, 90d, 6mo, 1yr, all-time)
  - Empty states are handled correctly
  - Navigation from exercise library to exercise detail works

## Not Proven By This UAT

- Mobile chart rendering (deferred to S04 with Victory Native XL)
- Chart performance with 50+ data points (only tested with typical 3-20 workout range)
- Chart accessibility (screen reader experience, keyboard navigation within chart)
- Chart print/export functionality (not implemented)
- Unit preference integration in chart axes (axes show "kg" — lbs conversion in chart labels not verified)

## Notes for Tester

- The chart uses `useQuery` Convex subscription — if you log a new workout while the detail page is open, the chart should auto-update with the new data point (reactive).
- If you see "No personal records yet" for an exercise you've done, check that the workout was actually completed (not left as inProgress).
- The `data-exercise-chart` attribute is on the chart container div — use browser DevTools to verify: `document.querySelectorAll('[data-exercise-chart]')`.
- Backend verification is authoritative: run `npx tsx packages/backend/scripts/verify-s02-m02.ts` from `packages/backend` to confirm data accuracy independently of UI.
