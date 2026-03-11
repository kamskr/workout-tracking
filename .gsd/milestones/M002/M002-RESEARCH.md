# M002: Analytics & Progress — Research

**Date:** 2026-03-11

## Summary

M002 adds analytics on top of M001's normalized 8-table schema. The three features — PR detection (R012), progress charts (R013), and volume analytics with heatmaps (R014) — all derive from the same data: sets joined through workoutExercises to workouts and exercises. The core technical challenge is that Convex has no native aggregation (no SUM, GROUP BY, COUNT) and no server-side joins. Every analytics query must traverse `workouts → workoutExercises → sets → exercises` using multiple indexed lookups and client-side (server function) reduction. For a user with 100 workouts averaging 5 exercises with 4 sets each, that's ~2,000 set documents to scan — feasible with on-demand computation for M002's single-user scale, but the query patterns need careful design to avoid Convex function timeouts or excessive document reads.

The recommended approach is **on-demand computation with targeted indexes** for M002, deferring pre-computed rollup tables until proven necessary. PR detection should be triggered inline during `logSet` (comparing the new set against historical bests for that exercise). Progress charts and volume analytics should use dedicated Convex query functions that traverse the data graph and return pre-shaped chart data. Charting should use **Recharts** on web and **Victory Native XL** on mobile — these are the best-in-class options for their respective platforms and both handle the line/bar chart needs well. A muscle group heatmap is best implemented as a custom SVG/View component (body outline with color-coded muscle groups) rather than a chart library feature.

The highest-risk item is the PR detection during live workouts (R012) — it touches the active workout mutation path, needs to compare against all historical data for that exercise, and must not slow down set logging. This should be proven first. Second risk is Convex query performance for analytics aggregation across hundreds of workouts. Third risk is cross-platform chart rendering, which requires two separate libraries with different APIs but the same data shapes.

## Recommendation

**Approach: On-demand aggregation with dedicated analytics queries. No pre-computed tables for M002.**

1. **PR Detection (S01, highest risk):** Add a `personalRecords` table to store detected PRs (1RM, volume PR, max reps at weight). PR check runs inside `logSet` mutation — after inserting the set, query historical bests for that exercise and compare. If a PR is detected, insert into `personalRecords`. The client subscribes to a reactive query for the active workout's PRs and shows a badge in realtime. Use the Epley formula for estimated 1RM: `weight × (1 + reps/30)`.

2. **Progress Charts (S02):** Dedicated query function `getExerciseProgress(exerciseId, periodDays?)` traverses `workoutExercises(by_exerciseId) → workouts (filter userId + completed) → sets` and returns time-series data shaped for charts: `[{ date, maxWeight, totalVolume, estimated1RM }]`. Recharts (web) and Victory Native XL (mobile) consume the same data shape.

3. **Volume Analytics & Heatmaps (S03):** Dedicated query function `getVolumeByMuscleGroup(periodDays)` traverses `workouts(by_userId) → workoutExercises → sets + exercises` and aggregates volume (sets × reps × weight) by primaryMuscleGroup. Weekly/monthly summaries use similar traversals. Muscle group heatmap is a custom component (SVG on web, View-based on mobile) that maps volume percentages to color intensities.

4. **Index additions needed:** Add `by_userId_completedAt` composite index on `workouts` table to efficiently query completed workouts in a time range. Consider `by_exerciseId_completedAt` on a denormalized field if exercise history queries become too slow.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Web charts (line, bar) | Recharts (`recharts`) | Most popular React chart library (benchmark 86.9), declarative composable API, ResponsiveContainer for layout, lightweight. Already React-based, matches Next.js stack. |
| Mobile charts (line, bar) | Victory Native XL (`victory-native`) | Purpose-built for React Native with Skia rendering. High-performance, animated. Project already has `react-native-reanimated` and `react-native-gesture-handler` as dependencies — only needs `@shopify/react-native-skia` added. |
| Estimated 1RM formula | Epley formula: `weight × (1 + reps/30)` | Well-established strength training standard. Simple to implement. No library needed — it's a one-liner. |
| Convex aggregation at scale | `@convex-dev/aggregate` component | **Not recommended for M002.** Single-user workout data (hundreds, not millions of documents) doesn't need sharded counters or B-tree aggregation. On-demand computation is simpler and sufficient. Revisit if query performance degrades. |
| SVG body heatmap (web) | Custom SVG component | No good off-the-shelf muscle heatmap library exists. A static SVG body outline with dynamically colored muscle group regions is straightforward to build (~200 LOC). |
| SVG body heatmap (mobile) | `react-native-svg` | The project avoided `react-native-svg` in M001 (D042) for just a timer circle. For a muscle heatmap with 9 regions, SVG is the right tool. Worth adding as a dependency for M002. |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — Normalized schema with workouts → workoutExercises → sets graph. Missing index: needs `by_userId_status` extended or a new `by_userId_completedAt` index for time-range queries on completed workouts.
- `packages/backend/convex/sets.ts` → `getPreviousPerformance` — **Key pattern to reuse.** Already traverses `workoutExercises(by_exerciseId) → workouts → sets` to find historical data for an exercise. PR detection and progress chart queries will follow this exact traversal pattern. 
- `packages/backend/convex/sets.ts` → `logSet` — **PR detection integration point.** After inserting the set, the mutation should check for PRs. Must not make `logSet` significantly slower.
- `packages/backend/convex/workouts.ts` → `getWorkoutWithDetails` — Traverses `workouts → workoutExercises → (exercise + sets)`. Volume analytics queries follow the same pattern but across multiple workouts.
- `packages/backend/convex/exercises.ts` — `primaryMuscleGroup` and `secondaryMuscleGroups` fields on exercises. Heatmap aggregation uses these to map set volume to muscle groups.
- `packages/backend/convex/testing.ts` — Established test helper pattern with `testUserId` arg. Analytics queries need the same pattern for verification scripts.
- `apps/web/src/lib/utils.ts` — `cn()` Tailwind merge utility.
- `apps/native/src/lib/units.ts` — Shared weight formatting utilities. Analytics displays will need these for chart labels.
- `apps/native/src/lib/theme.ts` — Color/spacing constants for consistent mobile styling.
- `apps/web/src/components/workouts/WorkoutCard.tsx` — Self-fetching pattern (D020) using `useQuery`. Analytics components should follow the same pattern.
- `packages/backend/data/exercises.json` — 144 exercises across 9 muscle groups. Muscle distribution: legs (34), back (21), shoulders (20), chest (16), biceps (14), core (14), triceps (10), fullBody (8), cardio (7).

## Constraints

- **Convex has no native aggregation.** No `SUM()`, `COUNT()`, `AVG()`, `GROUP BY`. All aggregation is done in the Convex function handler by collecting documents and reducing in JavaScript. This means every analytics query loads raw documents into function memory.
- **Convex function timeout is 10 seconds (queries) / 120 seconds (mutations).** Analytics queries traversing hundreds of workouts must complete within 10 seconds. On-demand aggregation is feasible for single-user scale but may need optimization.
- **Convex document read limits.** Each indexed query can read up to 16,384 documents. A user with 200 workouts × 5 exercises × 4 sets = 4,000 sets total. Within limits, but queries should use `.take()` guards.
- **No `convex.config.ts` exists yet.** Using `@convex-dev/aggregate` or other Convex components would require creating this file. Not needed for M002 if we stay with on-demand computation.
- **Chart libraries are platform-specific.** Recharts is SVG-based (web only). Victory Native XL uses Skia (React Native only). The data shape contract between backend and frontend should be identical across platforms, but chart components are fully separate code.
- **Victory Native XL requires `@shopify/react-native-skia` peer dependency.** This is a significant native module (~2MB). Project already has `react-native-reanimated` (v4.1.5) and `react-native-gesture-handler` (v2.29.1) — both are compatible peer deps.
- **Existing `by_exerciseId` index on `workoutExercises` is not user-scoped.** `getPreviousPerformance` already works around this by post-filtering for `workout.userId`. Same approach needed for PR detection. Consider adding a composite index if query volume grows.

## Common Pitfalls

- **PR detection slowing down set logging** — If PR check queries too much historical data inside `logSet`, it will make every set log noticeably slower. Mitigation: Keep PR detection lightweight. Query only the `personalRecords` table (not all historical sets) for the current best, compare against the new set. Store detected PRs as records to avoid re-scanning history every time.
- **Aggregation query scanning entire workout history** — A naive "get all volume this month" query that collects all workouts, then all exercises, then all sets is O(workouts × exercises × sets). Mitigation: Use the time-range index to narrow workouts first, then traverse only the relevant subset.
- **Chart data over-fetching on mobile** — Sending hundreds of data points to mobile chart components when the screen can only meaningfully display ~30 creates unnecessary processing. Mitigation: Aggregate data points by week/month at the query level, not the client level.
- **Incorrect 1RM estimation for low-rep sets** — The Epley formula becomes inaccurate for sets of 1-2 reps. Mitigation: For 1-rep sets, the actual weight IS the 1RM. For 2-3 rep sets, Epley is acceptable. Don't estimate 1RM from sets > 15 reps (too inaccurate).
- **Muscle group heatmap over-counting supersets** — Sets in a superset shouldn't be double-counted for volume. They're already correctly modeled as individual sets under individual workoutExercises, so this is actually not a problem with the current schema — just validate during implementation.
- **Timezone issues in weekly/monthly summaries** — Convex stores timestamps as UTC epoch milliseconds. "This week" and "this month" need the user's timezone. Mitigation: Send the timezone offset from the client and compute period boundaries server-side.
- **Two chart libraries with divergent APIs** — Recharts and Victory Native have completely different component APIs. Mitigation: Define the data shape contract clearly at the Convex query level. Both chart components receive the same `{ date, value }[]` arrays. Don't try to abstract across chart libraries — just build each independently.

## Open Risks

- **Convex query performance at scale** — A power user with 500+ workouts could have 10,000+ sets. On-demand aggregation for volume analytics would read all of these. If this proves too slow (>2s query time), will need to introduce pre-computed rollup tables (a `dailyVolume` table updated by mutations). Monitor query latency during S01/S02 verification.
- **`@shopify/react-native-skia` compatibility with Expo 54** — Victory Native XL requires react-native-skia. Expo 54 (React Native 0.82.1) should be compatible, but native module compatibility needs verification during S02 setup. If incompatible, fallback to `react-native-chart-kit` (older but more stable).
- **Heatmap visual design** — No standard muscle group body SVG exists. Will need to create or source a body outline SVG with 9 addressable muscle group regions. Quality of the heatmap visual depends on this asset.
- **PR detection edge cases** — Machine exercises (where weight doesn't have the same meaning as barbell lifts), bodyweight exercises (where weight is the user's body weight, not external load), and cardio exercises (no weight/reps) all need different PR definitions or explicit exclusion.

## Candidate Requirements (Advisory)

These are patterns or features surfaced during research that may warrant explicit requirements. They are not auto-binding — present to user during planning.

| Candidate | Why | Recommendation |
|-----------|-----|----------------|
| **PR types beyond 1RM** — volume PR (most total volume in a single exercise session), rep PR (most reps at a given weight) | Context says R012 includes "1RM, volume PR, max reps at weight" — this is already in scope. Ensure all 3 PR types are implemented, not just 1RM. | Already covered by R012 language. Implementation should include all 3 types. |
| **Time period selector for analytics** — "Last 30 days", "Last 90 days", "Last 6 months", "All time" | R014 mentions "configurable time periods" — needs explicit periods defined. | Define standard periods: 30d, 90d, 6mo, 1yr, all-time. Default to 90d. |
| **Empty state handling for analytics** — What shows when user has <3 workouts? | Charts with 1-2 data points look broken. Need meaningful empty states. | Add empty/insufficient-data states: "Log more workouts to see trends" with minimum data thresholds per chart type. |
| **PR notification persistence** — Should PRs be dismissible? Stored permanently? | If PRs are only shown during the active workout session, they're lost if the user navigates away. | Store PRs in a `personalRecords` table. Show notification during workout + badge in exercise history. |
| **Unit-aware analytics** — Charts should respect user's unit preference | Weight values in charts must display in the user's preferred unit (kg/lbs). | Reuse existing `displayWeight`/`formatWeight` utilities from `units.ts`. Backend returns kg, charts convert at render time (same pattern as D021). |

## Requirements Assessment

### Table Stakes (must work correctly)
- R012 (PR tracking): Core motivational feature. PR detection logic must be accurate — false positives (announcing a PR that isn't one) damage trust more than missing one.
- R013 (Progress charts): Must show real data accurately. Charts with wrong data or broken rendering are worse than no charts.
- R014 (Volume analytics): Aggregation must match raw data exactly. If a user manually counts their sets and gets a different number, the analytics are broken.

### Expected Behaviors (not explicit but users will assume)
- Charts should load within 1-2 seconds, not show a loading spinner for 5+ seconds
- PR detection should handle exercise type variations (bodyweight exercises shouldn't track weight PRs)
- Analytics should be consistent between web and mobile — same numbers on both platforms
- Empty states should guide users to log more data, not show broken/empty charts

### Missing from Requirements
- **No requirement for analytics data accuracy verification.** The final acceptance criteria describe what users should see but not how to programmatically verify data accuracy. Verification scripts (established pattern from M001) should be built for each slice.
- **No explicit requirement for loading/empty states in analytics.** Charts need minimum data thresholds.
- **No explicit performance requirement.** "Performant with hundreds of workouts" is vague. Suggest: analytics queries < 2 seconds for a user with 200 workouts.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (121 installs) | available — recommended for Convex-specific patterns |
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — useful for writing Convex functions |
| Convex | `get-convex/agent-skills@schema-builder` (105 installs) | available — useful for schema changes |
| Convex | `get-convex/agent-skills@components-guide` (105 installs) | available — useful if we adopt @convex-dev/aggregate |
| React Native charts | `expo/skills@use-dom` (6.9K installs) | available — Expo DOM components, tangentially relevant |
| Recharts | `ansanabria/skills@recharts` (65 installs) | available — directly relevant for web charts |

**Install recommendations:** `get-convex/agent-skills@function-creator` and `get-convex/agent-skills@schema-builder` are directly relevant for M002's backend work. `ansanabria/skills@recharts` would help with web chart implementation. User decides.

## Sources

- Convex aggregation patterns and limitations (source: [Convex docs — Reading Data](https://docs.convex.dev/database/reading-data))
- Convex scheduled functions and cron jobs (source: [Convex docs — Scheduling](https://docs.convex.dev/scheduling/cron-jobs))
- Convex components architecture (source: [Convex docs — Using Components](https://docs.convex.dev/components/using))
- Convex best practices for scaling (source: [Convex docs — Best Practices](https://docs.convex.dev/understanding/best-practices))
- Victory Native XL installation and CartesianChart API (source: [Victory Native XL docs](https://github.com/formidablelabs/victory-native-xl))
- Recharts API — LineChart, BarChart, ResponsiveContainer (source: [Recharts docs](https://recharts.org))
- Epley 1RM formula — `weight × (1 + reps/30)` (standard strength training formula, widely used in fitness apps)
