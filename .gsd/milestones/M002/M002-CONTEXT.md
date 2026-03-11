# M002: Analytics & Progress — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M001 completion

## Project Description

Adds comprehensive analytics and progress tracking to the workout app — personal records detection, per-exercise progress charts, volume analytics, muscle group heatmaps, and weekly/monthly summaries. Transforms raw workout data into actionable training insights.

## Why This Milestone

M001 captures workout data. M002 makes that data useful. Users need to see trends, track PRs, identify muscle imbalances, and feel progress. Without analytics, the app is just a log — analytics turn it into a training partner.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See a personal records feed showing all-time and recent PRs for every exercise
- View line charts showing weight/volume progression over time for any exercise
- See a muscle group heatmap showing which areas they've trained most/least in a period
- Browse weekly and monthly summary cards with total volume, workout count, and highlights
- Get a PR notification/badge inline when logging a set that beats a previous record

### Entry point / environment

- Entry point: Analytics tab/section in both web and mobile apps
- Environment: local dev, both platforms
- Live dependencies involved: Convex (data), Clerk (auth)

## Completion Class

- Contract complete means: All analytics queries return correct computed values, PR detection identifies records accurately against historical data, chart data structures are complete
- Integration complete means: Analytics work on both web and mobile, PR detection fires during live workout logging, charts render on both platforms
- Operational complete means: A user with 20+ workouts sees meaningful analytics across all views

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user with workout history can view progress charts for an exercise and the trend line reflects their actual data
- PR detection correctly identifies a new personal record during a live logging session
- Muscle group heatmap accurately reflects training distribution based on real workout data
- Weekly summary includes correct totals verified against raw workout data

## Risks and Unknowns

- **Charting library compatibility** — Need a charting solution that works on both web (React) and React Native. Options: Victory Native, react-native-chart-kit, or separate libraries per platform with shared data layer.
- **Aggregation performance** — Computing volume analytics and PR comparisons over large workout histories could be slow in Convex without aggregation primitives. May need denormalized summary tables or Convex actions for heavy computation.
- **1RM estimation** — Estimated 1RM from reps×weight uses formulas (Epley, Brzycki) that are approximations. Need to pick one and be transparent about it.

## Existing Codebase / Prior Art

- M001 delivers: workout schema, exercises, sets with full tracking data, user preferences — all the raw data M002 needs
- `convex/sets.ts` — Set data with weight/reps/RPE is the primary input for all analytics
- `convex/exercises.ts` — Exercise metadata (muscle groups) drives the heatmap

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R012 — Personal records tracking (primary: S01)
- R013 — Progress charts per exercise (primary: S02)
- R014 — Volume analytics and muscle group heatmaps (primary: S03)

## Scope

### In Scope

- PR detection and tracking (1RM, volume PR, max reps at weight)
- Per-exercise progress charts (weight, volume, estimated 1RM over time)
- Volume analytics per muscle group
- Muscle group heatmap visualization
- Weekly and monthly summary views
- Cross-platform chart rendering

### Out of Scope / Non-Goals

- Social features (M003)
- Custom analytics/reports
- Export to CSV/PDF

## Technical Constraints

- Convex has no built-in aggregation — need to compute analytics client-side or via Convex actions
- Charts must work on both React (web) and React Native (mobile)
- PR detection must be realtime (during workout logging), not just batch-computed

## Integration Points

- **M001 data model** — All analytics read from workouts, sets, exercises tables
- **Convex subscriptions** — PR detection should be reactive during active workouts
- **Charting library** — TBD, must support line/bar charts and heatmap-style visualization

## Open Questions

- **Denormalized PR table vs computed on read** — Pre-compute and store PRs for fast lookup, or compute from raw set data each time? Denormalized is faster but needs to stay in sync.
- **Chart library selection** — Victory Native XL is the leading cross-platform option but adds bundle size. Could also use different libs per platform with a shared data layer.
