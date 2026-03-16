---
id: T01
parent: S03
milestone: M006
provides:
  - Authenticated design-system tokens and reusable shell primitives for cards, headers, stats, and badges
key_files:
  - apps/web/src/app/globals.css
  - apps/web/src/components/app-shell/AppCard.tsx
  - apps/web/src/components/app-shell/PageHeader.tsx
  - apps/web/src/components/app-shell/StatCard.tsx
  - apps/web/src/components/app-shell/AppBadge.tsx
  - .gsd/milestones/M006/slices/S03/tasks/T01-PLAN.md
key_decisions:
  - D142: Shared app-shell primitives expose stable data-ui hooks and use a dedicated authenticated CSS namespace for later shell proof
patterns_established:
  - Presentational authenticated primitives compose styling and selectors without route imports or business logic
  - Authenticated shell tokens live in globals.css under a separate app-shell namespace, isolated from landing-* marketing styles
observability_surfaces:
  - data-ui="app-card"
  - data-ui="page-header"
  - data-ui="page-header-actions"
  - data-ui="stat-card"
  - data-ui="app-badge"
  - pnpm --filter web-app typecheck
duration: 25m
verification_result: passed
completed_at: 2026-03-16 20:17:07 CET
blocker_discovered: false
---

# T01: Define authenticated design tokens and shell primitives

**Added an isolated authenticated shell CSS namespace plus reusable card, header, stat, and badge primitives with stable browser-proof selectors.**

## What Happened

First I fixed the task-plan observability gap by adding an `## Observability Impact` section to `.gsd/milestones/M006/slices/S03/tasks/T01-PLAN.md` so later agents have an explicit inspection path for the shell seam.

Then I extended `apps/web/src/app/globals.css` with a clearly labeled authenticated-shell section that introduces app-surface tokens, shell chrome, warm gradient treatments, card/panel surfaces, badge typography, and page-header spacing classes. The new rules stay in an `app-shell` / `app-page` namespace and do not modify the existing `landing-*` homepage selectors.

I created thin presentational primitives in `apps/web/src/components/app-shell/`: `AppCard`, `PageHeader`, `StatCard`, and `AppBadge`. Each component uses `cn()` for composition, accepts children/props instead of owning data fetching, and exposes durable `data-ui` hooks needed for later Playwright/browser assertions.

I did not pull route logic, page imports, or business state into the primitives. They are ready for T02/T03 to consume as wrappers only.

## Verification

- Ran `pnpm --filter web-app typecheck` from the worktree.
- Result: passed (`tsc --noEmit`).
- Confirmed by inspection that the new primitives import only React types, `cn()`, and sibling UI primitives; no route/page imports or feature-specific business logic were introduced.

## Diagnostics

- Stable browser/assertion selectors now exist on the primitives via `data-ui="app-card"`, `data-ui="page-header"`, `data-ui="page-header-actions"`, `data-ui="stat-card"`, and `data-ui="app-badge"`.
- The authenticated shell vocabulary is centralized in `apps/web/src/app/globals.css` under the `app-shell` / `app-page` class namespace for future inspection.
- Compile verification command: `pnpm --filter web-app typecheck`.

## Deviations

- Added the missing `## Observability Impact` section to the task plan before implementation, per unit pre-flight instructions.

## Known Issues

- Slice-level runtime/browser verification remains blocked on later shell wiring tasks; this task only establishes the shared primitives and token surface.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S03/tasks/T01-PLAN.md` — added the missing observability-impact section required by pre-flight.
- `apps/web/src/app/globals.css` — added isolated authenticated shell design tokens and semantic utility classes.
- `apps/web/src/components/app-shell/AppCard.tsx` — added reusable authenticated card surface wrapper with `data-ui` hook.
- `apps/web/src/components/app-shell/PageHeader.tsx` — added shared title/subtitle/action-row wrapper with stable selectors.
- `apps/web/src/components/app-shell/StatCard.tsx` — added reusable stat summary surface wrapper with `data-ui` hook.
- `apps/web/src/components/app-shell/AppBadge.tsx` — added shared badge/pill component with tone and size variants.
- `.gsd/DECISIONS.md` — recorded the selectorized primitive pattern as the shell proof seam.
- `.gsd/milestones/M006/slices/S03/S03-PLAN.md` — marked T01 complete.
