---
id: T02
parent: S03
milestone: M002
provides:
  - MuscleHeatmap React component rendering front+back body views with 7 color-coded regions
  - Framework-agnostic SVG path data file (MUSCLE_REGIONS, BODY_OUTLINE_FRONT/BACK, VIEWBOX)
  - interpolateHeatmapColor color utility mapping 0-100% to gray→blue gradient
key_files:
  - packages/backend/data/muscle-heatmap-paths.ts
  - apps/web/src/components/analytics/MuscleHeatmap.tsx
  - apps/web/src/lib/colors.ts
key_decisions:
  - Placed SVG path data in packages/backend/data/ (alongside exercises.json) for cross-platform sharing via @packages/backend import alias
  - Used 5-stop linear gradient (gray-100 → blue-200 → blue-400 → blue-500 → blue-600) for smooth heatmap interpolation
  - Rendered fullBody and cardio as badge indicators below body views rather than body regions
patterns_established:
  - SVG path data extraction pattern — pure-data TS file with typed MuscleRegion interface, consumable by any framework
  - BodyView sub-component pattern — front/back views filter MUSCLE_REGIONS by view property
observability_surfaces:
  - data-analytics-heatmap attribute on root container for programmatic detection
  - data-muscle-group attributes on individual SVG path elements for per-region inspection
  - SVG title elements on each region showing "Label: X%" on hover
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: SVG muscle heatmap component + shared path data

**Built custom inline SVG muscle heatmap with 7 body regions, shared framework-agnostic path data, and color interpolation utility.**

## What Happened

Created three files:

1. **`packages/backend/data/muscle-heatmap-paths.ts`** — Framework-agnostic SVG path data defining 7 muscle regions (chest, back, shoulders, biceps, triceps, legs, core) across front and back body views. Exports typed `MuscleRegion[]` array, front/back body outline paths, and viewBox constants. No React/JSX — ready for S04 react-native-svg consumption.

2. **`apps/web/src/lib/colors.ts`** — `interpolateHeatmapColor(percentage)` maps 0-100% to a 5-stop gradient from light gray (#f3f4f6) to saturated blue (#2563eb). Pure function, ~40 LOC including helpers. Also exports gradient stops for the legend component.

3. **`apps/web/src/components/analytics/MuscleHeatmap.tsx`** — React component accepting `data: { muscleGroup, percentage }[]`. Renders front and back body views side by side using inline `<svg>` with `viewBox` and `preserveAspectRatio="xMidYMid meet"`. Each region's fill color is dynamically computed via `interpolateHeatmapColor`. Body outline rendered as subtle gray silhouette beneath regions. Includes color legend (low→high gradient bar) and fullBody/cardio indicator badges below the body views. Empty data renders all regions as light gray (graceful degradation).

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- Shared data file exports valid SVG path strings with correct types
- MuscleHeatmap component imports resolve correctly from `@packages/backend/data/muscle-heatmap-paths`
- `data-analytics-heatmap` attribute present on root container
- `data-muscle-group` attributes on all region path elements

### Slice-level verification (intermediate — T02 of T03):
- `pnpm turbo typecheck --force` — ✅ passes (0 errors)
- `verify-s03-m02.ts` — not re-run (T01 passing, no backend changes)
- Browser verification — deferred to T03 when dashboard page wires up all components

## Diagnostics

- CSS selector `[data-analytics-heatmap]` detects heatmap presence in browser
- CSS selector `[data-muscle-group="chest"]` (etc.) targets individual SVG regions
- SVG `<title>` elements provide hover tooltips with region name and percentage
- Empty data state: all regions render as light gray (#f3f4f6) — visually distinct from active regions

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/data/muscle-heatmap-paths.ts` — **new** — framework-agnostic SVG path data (7 regions, body outlines, viewBox constants)
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — **new** — React inline SVG heatmap component with front/back views, color legend, and fullBody/cardio badges
- `apps/web/src/lib/colors.ts` — **new** — color interpolation utility for heatmap gradient
