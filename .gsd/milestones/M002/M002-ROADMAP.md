# M002: Analytics & Progress

**Vision:** Transform raw workout logs into actionable insight — PRs motivate, charts show trends, heatmaps reveal imbalances. Users open the app between workouts to check progress, not just during sessions.

## Success Criteria

- A 🏆 PR badge appears in realtime when a user hits a personal record (1RM, volume PR, or rep PR) during a live workout session
- User can open any previously-performed exercise and view a line chart of weight/volume/estimated 1RM progression over time
- A muscle group heatmap accurately shows training volume distribution over a configurable period (30d, 90d, 6mo, 1yr, all-time)
- Weekly and monthly summary cards show correct totals (workout count, total volume, top exercises) matching actual logged data
- All analytics features work on both web and mobile with the same data accuracy
- A user with 20+ logged workouts sees accurate, performant analytics (queries < 2s)

## Key Risks / Unknowns

- **PR detection on the mutation path** — Checking historical bests inside `logSet` could slow down set logging. The query must compare against all historical data for an exercise without making every set log noticeably slower.
- **Convex aggregation performance** — No native SUM/GROUP BY. Analytics queries must traverse workouts → workoutExercises → sets → exercises entirely in JavaScript within the 10-second query timeout. A user with 200 workouts could mean scanning 4,000+ set documents.
- **Victory Native XL + Skia on Expo 54** — `@shopify/react-native-skia` is a heavy native module. Compatibility with Expo 54 / React Native 0.82.1 needs to be verified at install time. Fallback: `react-native-chart-kit`.
- **Muscle group heatmap SVG asset** — No standard body-outline SVG exists with 9 addressable muscle group regions. Must be sourced or created.

## Proof Strategy

- PR detection on mutation path → retire in S01 by building the real PR detection inside `logSet`, verifying it doesn't degrade set logging, and showing the 🏆 badge appear in a live web workout
- Convex aggregation performance → retire in S01/S02 by building real aggregation queries for PR history and exercise progress, verifying they complete within 2s for a user with 20+ workouts
- Victory Native XL + Skia → retire in S04 by installing the actual dependencies and rendering real charts on mobile
- Heatmap SVG asset → retire in S03 by building the actual heatmap component with a real body outline SVG

## Verification Classes

- Contract verification: Backend verification scripts (one per slice) proving analytics query accuracy against known test data — PR detection correctness, chart data shape, volume aggregation totals
- Integration verification: PR badge appearing during a live web workout session; charts updating after a new workout is logged; analytics dashboard rendering real data from Convex
- Operational verification: Analytics queries completing within 2 seconds for a user with 20+ workouts of historical data
- UAT / human verification: Chart readability, heatmap visual quality, mobile chart rendering quality

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices are complete with passing verification scripts
- PR detection works during live workout sessions on both web and mobile
- Progress charts render accurate data for at least 3 exercises on both platforms
- Muscle group heatmap accurately reflects training volume distribution
- Weekly/monthly summaries show correct totals matching raw logged data
- All analytics features work on both web and mobile
- TypeScript compiles with 0 errors across all 3 packages
- All M001 verification scripts still pass (no regression)

## Requirement Coverage

- Covers: R012 (Personal Records Tracking), R013 (Progress Charts Per Exercise), R014 (Volume Analytics and Muscle Group Heatmaps)
- Partially covers: none
- Leaves for later: R015-R021 (M003-M005), R024-R026 (deferred)
- Orphan risks: none — all 3 active M002 requirements are mapped to slices

## Slices

- [x] **S01: Personal Records — Detection & Live Notification** `risk:high` `depends:[]`
  > After this: User logs a set during a web workout and sees a 🏆 badge appear in realtime when they hit a new 1RM, volume PR, or rep PR — verified by backend script and live browser demo.

- [x] **S02: Progress Charts Per Exercise** `risk:medium` `depends:[S01]`
  > After this: User opens any exercise and views a Recharts line chart showing weight, volume, and estimated 1RM progression over time on web — with accurate data verified against raw sets.

- [ ] **S03: Volume Analytics, Muscle Heatmap & Summaries** `risk:medium` `depends:[S01]`
  > After this: User sees an analytics dashboard on web with a muscle group heatmap, volume breakdown by muscle group, and weekly/monthly summary cards — all showing correct aggregated data.

- [ ] **S04: Mobile Analytics — Charts, Heatmap & PRs** `risk:medium` `depends:[S01,S02,S03]`
  > After this: All analytics features (PR badges, progress charts, heatmap, summaries) work on mobile with Victory Native XL charts and react-native-svg heatmap — same data accuracy as web.

## Boundary Map

### S01 → S02

Produces:
- `personalRecords` table in Convex schema with indexes (`by_userId_exerciseId`, `by_workoutId`)
- `personalRecords.ts` Convex functions: `getPersonalRecords(exerciseId)` returning `{ type, value, date, setId }[]`
- PR detection logic inside `logSet` mutation that compares new sets against stored PR records
- `testing.ts` extended with PR-related test helpers
- Established analytics query pattern: time-range indexed traversal of workout → workoutExercise → set graph

Consumes:
- M001 schema (workouts, workoutExercises, sets, exercises tables with existing indexes)
- `logSet` mutation in `sets.ts`
- Existing test helper pattern from `testing.ts`

### S01 → S03

Produces:
- Same as S01 → S02 (personalRecords table and query patterns)
- New `by_userId_completedAt` composite index on `workouts` table for efficient time-range queries

Consumes:
- M001 schema and conventions

### S02 → S04

Produces:
- `analytics.ts` Convex query functions: `getExerciseProgress(exerciseId, periodDays?)` returning `{ date: number, maxWeight: number, totalVolume: number, estimated1RM: number }[]`
- Recharts-based web chart components (ExerciseProgressChart) proving the data shape works for rendering
- Exercise detail page/modal on web showing the chart

Consumes:
- S01's personalRecords table and time-range query patterns

### S03 → S04

Produces:
- `analytics.ts` Convex query functions: `getVolumeByMuscleGroup(periodDays)` returning `{ muscleGroup: string, volume: number, percentage: number }[]`, `getWeeklySummary()` / `getMonthlySummary()` returning `{ workoutCount, totalVolume, totalSets, topExercises }`
- Web analytics dashboard page at `/analytics` with muscle heatmap SVG component and summary cards
- SVG body outline asset with 9 addressable muscle group regions (reusable on mobile via react-native-svg)
- Time period selector component pattern (30d, 90d, 6mo, 1yr, all-time)

Consumes:
- S01's time-range query patterns and `by_userId_completedAt` index
