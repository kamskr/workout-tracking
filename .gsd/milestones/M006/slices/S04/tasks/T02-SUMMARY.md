---
id: T02
parent: S04
milestone: M006
provides:
  - Premium template and profile feature surfaces that reuse shared shell cards, empty states, and form vocabulary without changing feature behavior or verification hooks
key_files:
  - apps/web/src/components/templates/TemplateList.tsx
  - apps/web/src/components/templates/TemplateCard.tsx
  - apps/web/src/components/profile/ProfileSetupForm.tsx
  - apps/web/src/components/profile/ProfileStats.tsx
  - apps/web/src/components/profile/BadgeDisplay.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/components/app-shell/AppCard.tsx
key_decisions:
  - Added centralized feature-surface utilities in globals.css for empty states, inline loading, and premium form fields instead of repeating route-local class stacks inside templates and profile components
patterns_established:
  - Feature-domain components should compose AppCard, StatCard, AppBadge, and shared feature-* utilities while preserving existing data-* observability hooks at the component boundary
observability_surfaces:
  - data-template-list, data-profile-setup-form, data-profile-stats, data-badge-section, data-badge-card, data-badge-slug; centralized feature-* utilities in apps/web/src/app/globals.css; diagnostic port check via lsof -nP -iTCP:3001 -sTCP:LISTEN
duration: 35m
verification_result: passed
completed_at: 2026-03-16 15:05 GMT+1
blocker_discovered: false
---

# T02: Refresh templates and profile surfaces onto shared primitives

**Reskinned template and profile feature components onto shared shell cards, form fields, and empty-state primitives while preserving existing runtime selectors.**

## What Happened

I replaced the remaining local gray/white template and profile component shells with the shared authenticated-app design vocabulary introduced in S03/T01.

`TemplateList` now uses shared premium loading and empty states instead of bespoke centered gray content, and `TemplateCard` now renders through `AppCard` with warmer hierarchy, shell badges, richer structure cards, and a stronger start-workout affordance without changing start/delete behavior.

`ProfileSetupForm` moved off local bordered inputs and alert boxes onto shared premium form and helper surfaces backed by centralized `feature-*` utilities in `globals.css`. The existing username debounce, availability checks, validation, and submit flow were left intact.

`ProfileStats` now uses shared `StatCard`/`AppCard` primitives for loading, summary, top-exercise, and empty states. `BadgeDisplay` was reskinned the same way while keeping `data-badge-section`, `data-badge-card`, and `data-badge-slug` untouched.

I also made a small primitive extension to `AppCard` so hover/raise behavior can be opt-in instead of forced on every card, which keeps static forms and skeletons from feeling artificially interactive.

Before implementation, I fixed the pre-flight artifact gaps by adding a diagnostic verification step to `S04-PLAN.md` and an `Observability Impact` section to `T02-PLAN.md`.

## Verification

- Passed: `pnpm --filter web-app typecheck`
- Confirmed runtime diagnostic surface exists: `lsof -nP -iTCP:3001 -sTCP:LISTEN`
- Attempted browser verification against `http://127.0.0.1:3001/templates`, but navigation timed out against the already-running worktree server, so no UI assertion was recorded from the browser in this task
- Slice-level Playwright checks were not run in this task; those remain for later slice execution per plan

## Diagnostics

- Template list shell: `apps/web/src/components/templates/TemplateList.tsx` with `data-template-list`
- Profile setup shell: `apps/web/src/components/profile/ProfileSetupForm.tsx` with `data-profile-setup-form`
- Profile stats shell: `apps/web/src/components/profile/ProfileStats.tsx` with `data-profile-stats`
- Badge shell: `apps/web/src/components/profile/BadgeDisplay.tsx` with `data-badge-section`, `data-badge-card`, and `data-badge-slug`
- Shared styling seam for future refresh tasks: `apps/web/src/app/globals.css` `feature-*` utilities
- Runtime blocker triage: inspect the existing port-3001 process first with `lsof -nP -iTCP:3001 -sTCP:LISTEN` before treating browser timeouts as component regressions

## Deviations

- Added the required pre-flight observability fixes to `.gsd/milestones/M006/slices/S04/S04-PLAN.md` and `.gsd/milestones/M006/slices/S04/tasks/T02-PLAN.md` before implementation

## Known Issues

- Browser verification against the existing worktree server on port 3001 still times out in this environment, so the visual/runtime proof for these refreshed components remains pending slice-level Playwright/browser validation once the runtime blocker is cleared

## Files Created/Modified

- `.gsd/milestones/M006/slices/S04/S04-PLAN.md` — added a diagnostic verification step for the running worktree server on port 3001
- `.gsd/milestones/M006/slices/S04/tasks/T02-PLAN.md` — added `## Observability Impact` covering preserved selectors and centralized styling seams
- `apps/web/src/components/templates/TemplateList.tsx` — replaced bespoke loading/empty surfaces with shared premium card states
- `apps/web/src/components/templates/TemplateCard.tsx` — moved template cards onto `AppCard` and shared badge/surface styling while keeping behavior unchanged
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — reskinned setup form fields, helper states, and error surface using centralized premium utilities
- `apps/web/src/components/profile/ProfileStats.tsx` — replaced local stat cards and empty states with shared `StatCard`/`AppCard` structure
- `apps/web/src/components/profile/BadgeDisplay.tsx` — refreshed badge loading, empty, and populated states onto shared primitives while preserving badge hooks
- `apps/web/src/app/globals.css` — added centralized `feature-*` utilities for empty states, inline loading, and premium form controls
- `apps/web/src/components/app-shell/AppCard.tsx` — added opt-in interactivity so shared cards can be static or hover-reactive as needed
