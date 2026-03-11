---
estimated_steps: 4
estimated_files: 4
---

# T02: SVG muscle heatmap component + shared path data

**Slice:** S03 — Volume Analytics, Muscle Heatmap & Summaries
**Milestone:** M002

## Description

Build the novel visual for S03 — a custom inline SVG muscle group heatmap component. This task creates: (1) a shared SVG path data file with body outline regions that S04 mobile can also consume via react-native-svg, (2) a React `MuscleHeatmap` component that renders front and back body views with 7 color-coded body regions plus indicators for fullBody and cardio, and (3) a color interpolation utility for mapping volume percentages to fill colors.

## Steps

1. **Create shared SVG path data file at `packages/backend/data/muscle-heatmap-paths.ts`.**
   - Export an array of region definitions: `{ id: string, label: string, paths: string[], view: 'front' | 'back' }[]`
   - 7 body regions: chest (front), back (back), shoulders (front+back), biceps (front), triceps (back), legs (front+back), core (front)
   - Each region has one or more SVG path `d` strings and a viewBox-relative position
   - Export body outline paths separately (non-interactive silhouette)
   - Export the `viewBox` dimensions as constants
   - Use simplified, clean geometric shapes — recognizable body silhouette, not anatomically detailed
   - This file must be framework-agnostic (pure data — no JSX, no React imports) so S04 can use it with react-native-svg

2. **Create color interpolation utility at `apps/web/src/lib/colors.ts`.**
   - `interpolateHeatmapColor(percentage: number): string` — maps 0-100% to a color gradient
   - 0% = light gray (#f3f4f6), 100% = saturated blue (#2563eb) with intermediate steps
   - Returns CSS color string (hex)
   - Pure function, ~10 LOC

3. **Build `MuscleHeatmap` React component at `apps/web/src/components/analytics/MuscleHeatmap.tsx`.**
   - Props: `data: { muscleGroup: string, percentage: number }[]`
   - Imports SVG path data from `@packages/backend/data/muscle-heatmap-paths`
   - Renders two body views side by side (front and back) using inline `<svg>` elements
   - Each region's fill color computed via `interpolateHeatmapColor(percentage)` from the data prop
   - Body outline rendered as a subtle stroke with no fill
   - Regions with no data render as light gray (0%)
   - fullBody and cardio: render as small labeled badges/indicators below the body SVGs (not body regions)
   - Uses `viewBox` with percentage-based container sizing, `preserveAspectRatio="xMidYMid meet"`
   - Includes a color legend showing the gradient scale (low → high)
   - `data-analytics-heatmap` attribute on the root container
   - Handles empty data gracefully (all regions light gray)

4. **Verify typecheck passes.**
   - `pnpm turbo typecheck --force` — 0 errors
   - Confirm the shared package imports resolve correctly in `apps/web`

## Must-Haves

- [ ] Shared SVG path data file at `packages/backend/data/muscle-heatmap-paths.ts` with 7 body regions, framework-agnostic (no React/JSX)
- [ ] Color interpolation utility maps 0-100% to a visible gradient
- [ ] MuscleHeatmap component renders front+back body views with dynamic fill colors
- [ ] fullBody and cardio shown as indicators, not body regions
- [ ] `data-analytics-heatmap` attribute for programmatic detection
- [ ] `viewBox` + `preserveAspectRatio` for responsive scaling
- [ ] Typecheck passes across all packages

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- Shared data file exports region definitions with valid SVG path strings
- MuscleHeatmap component renders without errors when given sample data

## Observability Impact

- Signals added/changed: `data-analytics-heatmap` attribute on heatmap container for programmatic detection (extends D057 pattern)
- How a future agent inspects this: CSS selector `[data-analytics-heatmap]` detects heatmap presence in browser. SVG region elements identifiable by `data-muscle-group` attributes.
- Failure state exposed: Component renders all-gray when given empty data — visual indication of no-data state

## Inputs

- S03-RESEARCH.md — SVG heatmap design constraints (9 muscle groups, shared for mobile, viewBox sizing)
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — self-fetching component pattern to reference
- `packages/backend/convex/schema.ts` — 9 muscle group enum values

## Expected Output

- `packages/backend/data/muscle-heatmap-paths.ts` — **new** — framework-agnostic SVG path data for body outline regions
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — **new** — React inline SVG heatmap component
- `apps/web/src/lib/colors.ts` — **new** — color interpolation utility
- Both web and native already have `@packages/backend` path alias — no tsconfig changes needed
