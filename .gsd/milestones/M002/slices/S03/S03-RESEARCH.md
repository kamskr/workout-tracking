# S03: Volume Analytics, Muscle Heatmap & Summaries — Research

**Date:** 2026-03-11

## Summary

S03 delivers the analytics dashboard (R014): volume by muscle group, muscle heatmap visualization, and weekly/monthly summary cards — all on web. The backend work follows established patterns from S01/S02: traverse `workouts → workoutExercises → sets → exercises` with time-range filtering via the `by_userId_completedAt` index on workouts, aggregate in JavaScript, return pre-shaped data. The three new Convex queries (`getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary`) go in the existing `analytics.ts` module and follow the `computeX` extraction pattern from S02 (shared function callable from both auth-gated query and test helper).

The main novel work is the muscle group heatmap — a custom inline SVG component with 9 addressable regions (chest, back, shoulders, biceps, triceps, legs, core, fullBody, cardio) mapped to color intensities based on volume percentage. No off-the-shelf library exists for this; it's ~200-300 LOC of hand-drawn SVG paths in a React component. The web dashboard page at `/analytics` uses Recharts `BarChart` for the volume breakdown and the custom SVG for the heatmap, plus summary stat cards. The time period selector pattern from S02's exercise detail page (`PeriodSelector` pill buttons) is directly reusable.

The primary risk is the aggregation query complexity: `getVolumeByMuscleGroup` must join across 4 tables (workouts → workoutExercises → sets → exercises) for every workout in the period. For a user with 100 completed workouts, this means ~500 workoutExercise lookups, ~2000 set lookups, and ~500 exercise lookups. Convex function timeout is 10s for queries. Mitigation: the `by_userId_completedAt` index narrows workouts to the selected period first, and exercise data can be batch-fetched once (144 exercises max) then looked up in a Map. This should keep queries well under 2s for the target scale (200 workouts).

## Recommendation

**Approach: Three new analytics queries in `analytics.ts` with extracted `compute*` functions, one new `/analytics` route with dashboard layout, custom inline SVG heatmap component, Recharts BarChart for volume breakdown.**

### Backend (analytics.ts)

1. **`getVolumeByMuscleGroup(periodDays?)`** — Traverse completed workouts in period → workoutExercises → sets → exercises. Aggregate `weight × reps` by `primaryMuscleGroup`. Also attribute a fraction (e.g., 0.5×) to `secondaryMuscleGroups` for more accurate heatmap coloring. Return `{ muscleGroup: string, totalVolume: number, setCount: number, percentage: number }[]` sorted by volume desc.

2. **`getWeeklySummary()`** — Last 7 days of completed workouts. Return `{ workoutCount: number, totalVolume: number, totalSets: number, topExercises: { name: string, volume: number }[] }`. "Top exercises" = top 3 by volume.

3. **`getMonthlySummary()`** — Last 30 days. Same shape as weekly.

All three follow the `computeX` extraction pattern — shared function callable from both auth-gated queries and `testX` helpers in `testing.ts`.

### Frontend

1. **`/analytics` route** — New Next.js page. Protected by Clerk middleware (add `/analytics(.*)` to `isProtectedRoute` matcher). Layout: time period selector at top, then a 2-column grid on desktop (heatmap left, bar chart right), summary cards below.

2. **`MuscleHeatmap` component** — Custom inline SVG with 9 muscle group regions. Each region's fill color interpolates from light gray (0% volume) to a saturated color (max volume). Front and back body views. Props: `data: { muscleGroup: string, percentage: number }[]`.

3. **`VolumeByMuscleGroupChart` component** — Recharts horizontal `BarChart`. Each bar = one muscle group. Color-coded to match heatmap regions. Self-fetching pattern (D020) with `useQuery`.

4. **Summary cards** — Simple stat cards for workout count, total volume, total sets, top exercises. Self-fetching per summary type.

### Volume calculation edge cases

- **Bodyweight exercises** (no `weight` field) — Skip from volume calculation (volume = 0). These exercises contribute set count to summaries but not weight-based volume. Consistent with S02's ExerciseProgressChart behavior.
- **Warmup sets** — Exclude from volume (consistent with S01/S02 pattern: `isWarmup === true` sets are skipped).
- **Cardio exercises** — Have no weight/reps. Skip from volume. Include in workout count and set count for summaries.
- **Secondary muscle groups** — Include at 50% volume attribution for heatmap accuracy. If bench press is 100kg×10 (primary: chest, secondary: triceps, shoulders), chest gets 1000 volume, triceps and shoulders each get 500. This is configurable and can be toggled.

### Navigation

Add an "Analytics" link to the workout history page header (alongside "Templates" and "Start Workout") for discoverability. The `Header.tsx` component is landing-page-only and won't be modified.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Volume bar chart (web) | Recharts `BarChart` (`recharts@^3.8.0`) | Already installed in `apps/web`. `ExerciseProgressChart` proves the pattern. BarChart/Bar/XAxis/YAxis/Tooltip all available. |
| Muscle heatmap SVG | Custom inline SVG component | No off-the-shelf library exists for a 9-region body outline heatmap. Must be hand-authored. React inline SVG with dynamic fill colors is straightforward. |
| Time period selector | Reuse `PeriodSelector` pattern from `/exercises/[id]` | Same pill-button UI, same `PERIODS` array, same state shape. Extract to shared component or copy pattern. |
| Summary stat cards | Tailwind CSS cards | Matches existing card patterns in `WorkoutCard`, `PRSummary`. No component library needed. |
| Color interpolation | Simple linear interpolation function | Map 0-100% → light gray to saturated color. ~5 LOC utility. No library needed. |

## Existing Code and Patterns

- `packages/backend/convex/analytics.ts` — S03 queries go here. Follow `computeExerciseProgress` pattern: extract shared function, expose via auth-gated query + test helper.
- `packages/backend/convex/testing.ts` — Add `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary`. Follow existing `testGetExerciseProgress` pattern with `testUserId` arg.
- `packages/backend/convex/schema.ts` — `by_userId_completedAt` index on workouts already exists (added in S01). Exercises table has `primaryMuscleGroup` and `secondaryMuscleGroups` fields. No schema changes needed for S03.
- `apps/web/src/app/exercises/[id]/page.tsx` — `PeriodSelector` component and `PERIODS` constant. Reuse pattern for analytics dashboard time period control.
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — Self-fetching chart component pattern with loading/empty states and `data-*` attributes. Follow for volume chart.
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — Navigation pattern with "Templates" + "Start Workout" buttons. Add "Analytics" link here.
- `apps/web/src/middleware.ts` — Must add `/analytics(.*)` to `isProtectedRoute` matcher.
- `apps/web/src/lib/units.ts` — `formatWeight` for volume display in user's preferred unit.
- `apps/web/src/app/globals.css` — Tailwind v4 setup. No special CSS needed for S03 beyond inline SVG styles.
- `packages/backend/data/exercises.json` — 144 exercises across 9 muscle groups. Distribution: legs(34), back(21), shoulders(20), chest(16), biceps(14), core(14), triceps(10), fullBody(8), cardio(7). Secondary muscle groups are heavily used (core:36, shoulders:31, biceps:17, triceps:16).

## Constraints

- **Convex 10s query timeout.** The `getVolumeByMuscleGroup` query is the heaviest — it must traverse all workouts in the period, then all their exercises and sets. For 200 workouts × 5 exercises × 4 sets = 4000 sets + 1000 workoutExercises + 200 workouts + 1 exercise fetch (batch all exercises once). Well within 10s at Convex function speed, but should use `.take()` guards.
- **Convex 16,384 document read limit per indexed query.** A single `by_userId_completedAt` query covering all-time for a user with 200 workouts reads 200 docs — far within limit. The per-workout fan-out (workoutExercises and sets) each hit separate indexed queries, also within limits.
- **No schema changes needed.** `by_userId_completedAt` index exists. Exercises have `primaryMuscleGroup` and `secondaryMuscleGroups`. All tables needed are in place.
- **Recharts 3.8.0 already installed.** BarChart, Bar, Cell, Tooltip, XAxis, YAxis, ResponsiveContainer are all available. No new dependencies needed for web charts.
- **Muscle group enum is fixed at 9 values.** The SVG heatmap must have exactly 9 addressable regions: chest, back, shoulders, biceps, triceps, legs, core, fullBody, cardio. `fullBody` and `cardio` don't map to specific body parts — they'll be shown as overlay or sidebar indicators, not body regions.
- **SVG heatmap must be reusable for mobile (S04).** S03→S04 boundary says the SVG body outline asset must be shareable. On mobile it will render via `react-native-svg`. This means the SVG paths should be extracted as data (path strings + region IDs), not embedded in JSX. A shared data file with SVG paths that both web and mobile components consume.

## Common Pitfalls

- **Aggregation over-fetching all exercises for every set** — Naively calling `ctx.db.get(exerciseId)` inside the per-workoutExercise loop would make N separate DB calls (one per workoutExercise). Mitigation: batch-fetch all exercises once into a `Map<Id, Exercise>` at the start of the query, then look up from the map. 144 exercises total — easy to fit in memory.
- **Volume double-counting with secondary muscle groups** — If secondary attribution isn't clearly documented, it could confuse users who manually calculate volume. Mitigation: Show primary-only volume as the main metric. Secondary attribution (50%) is used only for heatmap color intensity, with a clear tooltip/legend explaining the methodology.
- **Bodyweight/cardio exercises inflating set counts but not volume** — A user doing 5 sets of planks gets 5 sets counted in "total sets" but 0 volume. This is correct behavior but might look surprising in summaries. Mitigation: Consider showing "sets" and "volume" as separate metrics in summaries so users understand the distinction.
- **SVG heatmap sizing on different viewports** — An absolute-pixel SVG will be too large or small on different screens. Mitigation: Use `viewBox` with percentage-based container sizing. `preserveAspectRatio="xMidYMid meet"` ensures the body outline scales properly.
- **"fullBody" and "cardio" muscle groups don't map to body parts** — These 15 exercises have primaryMuscleGroup values that don't correspond to a body region. Mitigation: For the heatmap, map `fullBody` to a whole-body highlight (lighter shade on all regions) and `cardio` to a badge/indicator outside the body. In the bar chart, they appear as normal bars.
- **Empty state when user has no completed workouts** — Analytics page with no data should show meaningful guidance. Mitigation: Check for empty data early and show "Log your first workout to see analytics" with a link to start a workout.

## Open Risks

- **SVG heatmap visual quality** — The hand-drawn SVG body outline needs to look professional. If the initial SVG quality is poor, it may need multiple iterations. Mitigation: Use simplified body outline with clean geometric shapes rather than anatomically detailed illustration. Focus on recognizability over realism.
- **Secondary muscle group attribution accuracy** — The 50% secondary attribution is a simplification. Some exercises have 2+ secondary groups. A bench press with secondaryMuscleGroups: ["triceps", "shoulders"] would give 50% each on top of 100% primary. This means total attributed volume exceeds raw volume. Mitigation: Document this as "effective training volume per muscle group" rather than "raw volume". The heatmap uses percentages (each group's proportion of the total effective volume), which normalizes this.
- **Aggregation query performance with large datasets** — While the math works for 200 workouts, a power user with 500+ workouts and "all-time" period could push query time above 2s. Mitigation: Default period to 90d (not all-time). Add `.take(500)` guard on the workouts query. Monitor query latency in verification.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Recharts | `yonatangross/orchestkit@recharts-patterns` (82 installs) | available — directly relevant for bar chart implementation |
| Recharts | `ansanabria/skills@recharts` (65 installs) | available — directly relevant for chart patterns |
| Convex | `get-convex/agent-skills@function-creator` (111 installs) | available — relevant for writing Convex query functions |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (122 installs) | available — relevant for Convex patterns |
| SVG | `liuyunlong2021-wq/svg-skills@svg-animation-engineer` (11 installs) | available — tangentially relevant, low install count |
| Frontend design | `frontend-design` | installed — relevant for dashboard layout and heatmap visual quality |

**Install recommendations:** `yonatangross/orchestkit@recharts-patterns` or `ansanabria/skills@recharts` would help with the bar chart. `get-convex/agent-skills@function-creator` would help with the analytics queries. The installed `frontend-design` skill is directly relevant for the dashboard page. User decides on installs.

## Sources

- Recharts BarChart API — `BarChart`, `Bar`, `Cell`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` (source: [Recharts docs via Context7](/recharts/recharts))
- Existing `analytics.ts` pattern — `computeExerciseProgress` extracted function pattern for auth-gated + test helper reuse
- Exercise data model — 144 exercises across 9 `primaryMuscleGroup` values, with `secondaryMuscleGroups` arrays heavily used (core:36 references, shoulders:31, etc.)
- S02 forward intelligence — `analytics.ts` is the established module, `computeX` pattern, `PeriodSelector` reusable pattern, `data-*` attributes for programmatic verification
- S01 forward intelligence — `by_userId_completedAt` index ready, `convex/lib/` convention for shared helpers
