# M002: Analytics & Progress — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M001 completion

## Project Description

Add comprehensive analytics and progress tracking to the workout app. Users see personal records detected in realtime, progress charts per exercise, volume analytics across muscle groups, muscle group heatmaps, and weekly/monthly summary dashboards — all on both web and mobile.

## Why This Milestone

With M001 delivering core logging, users accumulate data but have no way to visualize progress. Analytics transform raw workout logs into actionable insight — PRs motivate, charts show trends, heatmaps reveal imbalances. This is the feature set that makes users open the app between workouts.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See a 🏆 badge appear in realtime when they hit a personal record during a workout
- Open any exercise and view a line chart of their weight/volume progression over weeks/months
- See a muscle group heatmap showing which body parts they've trained most in a given period
- View weekly and monthly summary cards showing total volume, workout count, and top exercises

### Entry point / environment

- Entry point: Analytics dashboard page (web), Analytics tab (mobile)
- Environment: local dev and production (both platforms)
- Live dependencies involved: Convex (realtime DB, aggregation queries), Clerk (auth)

## Completion Class

- Contract complete means: All analytics queries return correct aggregated data, PR detection logic is accurate, chart data is correctly shaped
- Integration complete means: PR badges appear during live workout sessions, charts update when new workouts are logged
- Operational complete means: Analytics remain performant with hundreds of workouts of historical data

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user with 20+ logged workouts sees accurate progress charts for at least 3 exercises
- PR detection correctly identifies a new 1RM during a live workout and surfaces it immediately
- Muscle group heatmap accurately reflects training volume distribution over the past month
- Weekly summary shows correct totals matching the actual logged data

## Risks and Unknowns

- **Convex aggregation performance** — Convex doesn't have native aggregation (SUM, AVG, GROUP BY). Analytics queries may need pre-computed aggregates or careful query design to avoid scanning entire history.
- **Cross-platform charting library** — Need a chart library that works well on both React (web) and React Native (mobile). Options include Victory Native, react-native-chart-kit, or separate libraries per platform.
- **PR detection accuracy** — Estimated 1RM formulas (Brzycki, Epley) vary. Need to pick one and handle edge cases (partial reps, machine exercises).

## Existing Codebase / Prior Art

- Everything built in M001 — schema, workout/set data, exercise library
- `convex/sets.ts` — Set data is the foundation for all analytics
- `convex/workoutExercises.ts` — Exercise-workout relationships needed for volume calculations
- `convex/exercises.ts` — Muscle group data needed for heatmaps

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R012 — Personal records tracking
- R013 — Progress charts per exercise
- R014 — Volume analytics and muscle group heatmaps

## Scope

### In Scope

- PR detection (1RM, volume PR, rep PR) with realtime notification during workouts
- Per-exercise progress charts (weight, volume, estimated 1RM over time)
- Total volume analytics by muscle group with configurable time periods
- Muscle group heatmap visualization
- Weekly and monthly workout summary dashboards
- Cross-platform UI for all analytics features

### Out of Scope / Non-Goals

- Social features (M003)
- Leaderboards (M004)
- AI-powered insights or recommendations
- Export data to CSV/spreadsheet

## Technical Constraints

- Analytics must be computed from the existing workout data — no separate analytics database
- Convex lacks native aggregation — will need efficient query patterns or pre-computed rollups
- Charts must work on both web and React Native

## Integration Points

- **M001 data model** — All analytics derive from workouts, sets, and exercises tables
- **Convex scheduled functions** — May use for pre-computing aggregates periodically

## Open Questions

- **Pre-compute vs. on-demand** — Should volume/PR data be pre-computed into summary tables (faster reads, more storage) or computed on-demand (simpler, slower for large datasets)? Likely pre-compute for frequently accessed aggregates.
- **Chart library** — Victory Native XL, react-native-chart-kit, or Nivo (web) + separate RN lib? Decision deferred to M002 planning.
