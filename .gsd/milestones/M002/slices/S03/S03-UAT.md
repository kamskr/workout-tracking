# S03: Volume Analytics, Muscle Heatmap & Summaries — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: Backend aggregation accuracy is proven by 11 automated checks (contract verification). Web UI wiring is verified by typecheck and data-attribute presence. However, the SVG heatmap's visual quality (body proportions, color gradient readability) and dashboard layout (responsive grid, empty/loading states) require human assessment — these are visual-fidelity concerns that automated checks cannot evaluate.

## Preconditions

- Convex dev backend running (`npx convex dev` in packages/backend)
- Web app running (`pnpm dev` in apps/web)
- User authenticated via Clerk
- User has at least 3-5 completed workouts with exercises spanning different muscle groups (chest, back, legs, shoulders)
- Exercise seed data loaded (exercises have primaryMuscleGroup and secondaryMuscleGroups)

## Smoke Test

Navigate to `/analytics`. The page should render without errors: a muscle heatmap SVG with colored body regions, a horizontal bar chart showing volume per muscle group, and two summary cards (weekly and monthly) with workout count, total volume, and top exercises.

## Test Cases

### 1. Heatmap visual quality

1. Navigate to `/analytics`
2. Observe the muscle heatmap SVG (front and back body views)
3. **Expected:** Body outline is proportionate and recognizable. Trained muscle groups show blue coloring proportional to their volume. Untrained regions are light gray. Color legend shows low→high gradient. Front/back views are labeled.

### 2. Period selector affects heatmap and bar chart

1. On `/analytics`, note the current heatmap colors and bar chart values
2. Click "7d" period selector
3. **Expected:** Heatmap and bar chart update to show only last 7 days of data. If no workouts in the last 7 days, heatmap shows all gray and bar chart shows empty state.
4. Click "All Time"
5. **Expected:** All historical workout data reflected in heatmap and bar chart.

### 3. Bar chart volume breakdown

1. On `/analytics`, observe the horizontal bar chart
2. **Expected:** Each muscle group with training data shows a horizontal bar. Bars are sorted or labeled clearly. Custom tooltip shows volume (in user's preferred unit) and set count on hover. Colors correspond to muscle groups.

### 4. Weekly summary card accuracy

1. Observe the "Weekly Summary" card
2. Count your workouts in the last 7 days manually
3. **Expected:** Workout count matches. Total volume and total sets are reasonable for those workouts. Top exercises listed are the ones with highest volume.

### 5. Monthly summary card accuracy

1. Observe the "Monthly Summary" card
2. **Expected:** Shows last 30 days of data. Workout count ≥ weekly count. Total volume ≥ weekly volume. Top exercises may differ from weekly if training varied.

### 6. Navigation from workout history

1. Navigate to `/workouts`
2. Look at the header bar
3. **Expected:** "Analytics" button/link is visible alongside "Templates" and "Start Workout"
4. Click "Analytics"
5. **Expected:** Navigates to `/analytics` page

### 7. Auth protection

1. Open an incognito/private browser window
2. Navigate directly to `/analytics`
3. **Expected:** Redirected to Clerk sign-in page (not shown analytics data)

## Edge Cases

### Empty state (no completed workouts)

1. Create a new account or use an account with no completed workouts
2. Navigate to `/analytics`
3. **Expected:** Page shows meaningful guidance text (not a blank page or error). Includes a link to start a workout. Heatmap shows all-gray body. Summary cards show 0 workouts, 0 volume.

### Bodyweight exercises

1. Log a workout with bodyweight exercises (push-ups, pull-ups)
2. Navigate to `/analytics`
3. **Expected:** Bodyweight exercises contribute to set counts in summary cards but not to weight-based volume (0 kg volume for those exercises).

### Responsive layout

1. Resize browser window to narrow width (~375px mobile)
2. **Expected:** Dashboard layout adapts — heatmap and bar chart stack vertically instead of side-by-side. Summary cards remain readable. No horizontal scrolling needed.

## Failure Signals

- Heatmap SVG doesn't render (blank area where body outline should be)
- Bar chart shows no data when workouts exist
- Summary card numbers are wildly wrong (e.g., 0 workouts when you have 10)
- Period selector doesn't change displayed data
- Page crashes or shows React error boundary
- `/analytics` accessible without authentication
- "Analytics" link missing from workout history header

## Requirements Proved By This UAT

- R014 (Volume Analytics and Muscle Group Heatmaps) — visual quality of heatmap, correct volume display in bar chart, accurate summary card totals with real user data, period filtering behavior, and empty state handling

## Not Proven By This UAT

- Mobile analytics rendering — S04 will port to React Native
- Performance with 200+ workouts — current verification uses smaller datasets; load testing deferred
- Secondary muscle group attribution accuracy is proven by automated script (verify-s03-m02.ts), not visually verifiable in UAT

## Notes for Tester

- The heatmap body outline is a hand-drawn SVG approximation — focus on whether muscle groups are distinguishable and color gradients are readable, not anatomical perfection.
- Volume is displayed in the user's preferred unit (kg or lbs) — check that the unit toggle in settings affects analytics display.
- Summary cards are always fixed at 7d (weekly) and 30d (monthly) regardless of the period selector — the selector only affects heatmap and bar chart.
- fullBody and cardio exercises appear as small badge indicators below the body views, not as body regions.
