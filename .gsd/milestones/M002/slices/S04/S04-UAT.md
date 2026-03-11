# S04: Mobile Analytics — Charts, Heatmap & PRs — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Victory Native XL (Skia), react-native-svg, and react-native-reanimated are native modules whose rendering cannot be verified by typecheck alone. Visual rendering quality, chart proportions, heatmap colors, and touch navigation all require a running Expo dev client or simulator.

## Preconditions

- Expo dev client or iOS simulator running with `npx expo start`
- Convex dev backend running with data (at least 1 user with 5+ logged workouts across multiple exercises)
- User authenticated via Clerk on mobile
- At least one workout should include a personal record (can use existing test data)

## Smoke Test

1. Open the mobile app
2. Tap the "Analytics" tab in bottom navigation
3. **Expected:** Analytics screen loads with muscle heatmap, volume bar chart, and summary cards visible — no red screen error

## Test Cases

### 1. PR Badges in Active Workout

1. Start a new workout on mobile
2. Add an exercise and log a set that beats a previous best (or log the first-ever set for an exercise)
3. **Expected:** 🏆 badge(s) appear on the exercise item in amber color (Weight PR / Volume PR / Reps PR). Badge text is readable.

### 2. Analytics Tab — Muscle Heatmap

1. Navigate to Analytics tab
2. Observe the muscle heatmap (front and back body views)
3. Tap different period pills (7d / 30d / 90d / All Time)
4. **Expected:** Body outline renders with color-coded muscle regions. Colors update when period changes. Regions with more volume are darker/warmer. Low-activity regions are lighter. Color legend is visible below the heatmap.

### 3. Analytics Tab — Volume Bar Chart

1. On the Analytics screen, scroll to the volume bar chart
2. Change period selection
3. **Expected:** Horizontal bar chart renders with labeled muscle groups and colored bars. Bar lengths change when period is switched. Muscle group labels are readable.

### 4. Analytics Tab — Summary Cards

1. Scroll to weekly and monthly summary sections
2. **Expected:** Weekly summary shows workout count, total volume (with unit), total sets, and top 3 exercises. Monthly summary shows the same for 30-day window. Numbers appear reasonable given workout history.

### 5. Exercise Detail — Progress Chart

1. Navigate to Exercises tab
2. Tap any exercise card
3. **Expected:** Exercise detail screen opens with exercise name, muscle group/equipment/type badges, PR summary cards (Best 1RM, Best Volume, Best Reps), and a line chart below.

### 6. Exercise Detail — Chart Interaction

1. On the exercise detail screen, switch between period pills (30d / 90d / 6mo / 1yr / All Time)
2. **Expected:** Chart updates to show data for the selected period. Lines represent maxWeight (blue), estimated1RM (teal), and totalVolume (amber). Dual y-axes are labeled.

### 7. Exercise Detail — Empty State

1. Navigate to an exercise that has never been performed
2. **Expected:** No crash. Exercise info renders. PR cards show dashes or zero. Chart shows "Not enough data yet" message.

## Edge Cases

### New User with No Workout History

1. Log in as a user with no completed workouts
2. Navigate to Analytics tab
3. **Expected:** All sections show empty/zero state messages — no crash, no spinner stuck forever.

### Exercise with Single Data Point

1. Open detail for an exercise performed in only one workout
2. **Expected:** Chart shows "Not enough data yet" (requires 2+ data points for a line). PR cards show values from the single workout.

### Period with No Data

1. On Analytics tab, select 7d when no workouts exist in the last 7 days
2. **Expected:** Heatmap shows no coloring (all regions at baseline). Bar chart shows empty/zero bars. Summary shows 0 workouts.

## Failure Signals

- React Native red screen / error boundary crash — indicates Skia, react-native-svg, or reanimated configuration issue
- Metro bundler error on app start — indicates missing native module linking
- Blank/empty chart area where data should render — indicates Victory Native XL rendering failure
- Heatmap body outline missing or paths not rendering — indicates react-native-svg issue
- Infinite loading spinner on Analytics tab — indicates Convex query failure (check auth, backend running)
- PR badges never appearing during workout — check that `getWorkoutPRs` query is being called (inspect Convex dashboard)

## Requirements Proved By This UAT

- R012 (Personal Records Tracking) — Mobile PR badge rendering during active workouts completes cross-platform delivery
- R013 (Progress Charts Per Exercise) — Mobile exercise detail screen with Victory Native XL line chart proves progress charts work on mobile
- R014 (Volume Analytics & Muscle Group Heatmaps) — Mobile analytics tab with heatmap, bar chart, and summary cards proves analytics work on mobile
- R011 (Cross-Platform UI) — All M002 features now verified on both platforms, extending R011 validation scope

## Not Proven By This UAT

- Backend data accuracy — already proven by 72/72 automated backend verification checks (verify-s01-m02 through verify-s05)
- Web analytics features — already proven by S01-S03 automated verification + browser demos
- Chart interaction (pan/zoom/tap-to-inspect) — not implemented, view-only charts
- Performance under heavy data load (200+ workouts) — not tested in UAT, would need synthetic data

## Notes for Tester

- If Skia fails to render (blank charts, crashes), try clearing Metro cache: `npx expo start --clear`
- The heatmap uses 7 addressable muscle regions (not 9 as originally planned) — this is by design based on the SVG asset created in S03
- Volume values displayed depend on the user's unit preference (kg vs lbs) — check Settings tab to confirm unit
- Summary cards show "top 3 exercises" — if fewer than 3 exercises have been performed, fewer will show
- PR detection is exercise-wide (not per-weight-tier) per D053 — a new user's first set for any exercise will always trigger all 3 PR types
