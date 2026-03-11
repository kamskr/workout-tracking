---
id: T02
parent: S02
milestone: M002
provides:
  - ExerciseProgressChart client component with reactive data subscription
  - recharts dependency installed in apps/web
key_files:
  - apps/web/src/components/exercises/ExerciseProgressChart.tsx
  - apps/web/package.json
key_decisions:
  - Custom Tooltip component instead of Recharts default formatter — provides styled tooltip matching app design with proper unit display (kg) and compact volume formatting
  - Dots shown only when ≤20 data points to avoid clutter on long histories
  - Volume axis uses compact number formatting (1.2k) via formatCompactNumber helper
patterns_established:
  - Chart components follow self-fetching pattern (D020) with useQuery internally, taking entity ID + optional filter props
  - data-exercise-chart attribute on all chart state containers (loading, empty, chart) for D057 programmatic detection
  - Recharts color constants defined at module level for consistency across tooltip and lines
observability_surfaces:
  - data-exercise-chart attribute on container div — enables document.querySelectorAll('[data-exercise-chart]') detection
  - useQuery subscription means chart auto-updates when new workouts are logged
  - undefined query result → loading spinner; empty/short array → empty state message; ≥2 points → chart render
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Install Recharts + build ExerciseProgressChart component

**Installed Recharts 3.8.0 and built ExerciseProgressChart with 3-line dual Y-axis chart, custom tooltip, and loading/empty states.**

## What Happened

1. Installed `recharts@^3.8.0` in `apps/web` via pnpm. Confirmed `react-is@19.2.4` already available in the dependency tree — no additional peer dependency needed for React 19 compatibility.

2. Built `ExerciseProgressChart.tsx` as a `"use client"` component with:
   - Self-fetching via `useQuery(api.analytics.getExerciseProgress, { exerciseId, periodDays })`
   - Three `Line` elements: Max Weight (blue #0d87e1, left Y-axis), Est. 1RM (teal #14b8a6, left Y-axis), Total Volume (amber #f59e0b, right Y-axis)
   - Dual Y-axes: left labeled "kg" for weight/1RM, right labeled "volume" with compact number formatting
   - XAxis with `formatDateTick` producing "MMM d" date labels
   - Custom `ChartTooltip` component showing full date, colored dots, metric names, and values with kg units
   - Loading state: spinner matching existing ExerciseList pattern
   - Empty state (< 2 data points): bar chart icon + "Log more workouts with this exercise to see progress charts"
   - `data-exercise-chart` attribute on all state containers (loading, empty, chart)
   - Dots conditional on ≤20 data points

3. Handled edge cases: `estimated1RM` undefined values handled by Recharts breaking the line (`connectNulls={false}`), volume axis uses `formatCompactNumber` for large values, component renders safely with empty query results.

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` exists with default export ✅
- `recharts: "^3.8.0"` present in `apps/web/package.json` dependencies ✅
- All 12 must-have checklist items verified via grep checks
- Slice-level `verify-s02-m02.ts` not runnable (Convex dev server not active) — 8/8 passed in T01

## Diagnostics

- `document.querySelectorAll('[data-exercise-chart]')` detects chart presence in browser
- Component's `useQuery` subscription auto-updates — no manual refresh needed
- Recharts rendering failures surface in browser console as React errors
- Three render states clearly distinguishable: spinner (loading), message (empty), chart (data)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — **new** — reactive chart component with 3 lines, dual Y-axes, custom tooltip, loading/empty states
- `apps/web/package.json` — added `recharts: "^3.8.0"` to dependencies
- `pnpm-lock.yaml` — updated with recharts and its transitive dependencies
