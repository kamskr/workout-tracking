---
id: S03
parent: M006
milestone: M006
provides:
  - Authenticated design tokens, shared app-shell primitives, a protected-route layout seam, and representative route retrofits with durable browser-proof hooks
requires:
  - slice: S01
    provides: Worktree-local dev stack wiring, seeded backend access, and the authenticated runtime boundary this shell builds on
affects:
  - S04
key_files:
  - apps/web/src/app/globals.css
  - apps/web/src/app/(app)/layout.tsx
  - apps/web/src/components/app-shell/AppShell.tsx
  - apps/web/src/components/app-shell/AppNav.tsx
  - apps/web/src/components/app-shell/AppCard.tsx
  - apps/web/src/components/app-shell/PageHeader.tsx
  - apps/web/src/components/app-shell/StatCard.tsx
  - apps/web/src/components/app-shell/AppBadge.tsx
  - apps/web/src/app/(app)/workouts/page.tsx
  - apps/web/src/app/(app)/exercises/page.tsx
  - apps/web/src/app/(app)/analytics/page.tsx
  - apps/web/src/app/(app)/feed/page.tsx
  - apps/web/src/app/(app)/leaderboards/page.tsx
  - apps/web/tests/app-shell.spec.ts
  - apps/web/playwright.config.ts
  - apps/web/package.json
key_decisions:
  - D172: authenticated routes now share a dedicated App Router shell seam while `/` and `/shared/[id]` stay on the public layout path
  - D173: shell runtime proof classifies Clerk/auth/env middleware failures from returned HTML before treating missing selectors as UI regressions
patterns_established:
  - Authenticated surfaces use an `app-shell` / `app-page` CSS namespace and thin presentational primitives with stable `data-ui` hooks instead of page-local wrappers
  - Representative authenticated routes expose `data-route`, `data-route-section`, and route-specific hooks so S04 can redesign pages without losing durable verification seams
observability_surfaces:
  - pnpm --filter web-app typecheck
  - pnpm --filter web-app exec playwright test tests/app-shell.spec.ts --config playwright.config.ts
  - apps/web/tests/app-shell.spec.ts
  - apps/web/playwright.config.ts
  - Route-level `data-ui` / `data-route*` hooks
  - Raw page HTML on port 3001 when Clerk middleware fails before hydration
drill_down_paths:
  - .gsd/milestones/M006/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S03/tasks/T03-SUMMARY.md
duration: 3h
verification_result: passed
completed_at: 2026-03-16 14:51 CET
---

# S03: App Shell & Design System

**Authenticated web routes now share one Apple Fitness+-style shell, common page/card primitives, and a route-aware proof surface that downstream page refresh work can extend instead of rebuilding chrome.**

## What Happened

S03 established the authenticated design vocabulary in one place before widening the redesign. `apps/web/src/app/globals.css` now contains a dedicated `app-shell` / `app-page` namespace for warm gradients, glassy chrome, page spacing, panel surfaces, and badge/header/card styling that stays separate from the landing-page `landing-*` styles added in S02.

On top of those tokens, the slice added thin presentational primitives in `apps/web/src/components/app-shell/`: `AppCard`, `PageHeader`, `StatCard`, and `AppBadge`. They are deliberately dumb wrappers — no route imports, no feature data fetching — and expose stable `data-ui` hooks for browser proof.

The authenticated routing seam moved from ad hoc page wrappers to a dedicated App Router route group. Protected pages now live under `apps/web/src/app/(app)/` and inherit `AppShell` through `apps/web/src/app/(app)/layout.tsx`, while the root layout remains provider-only so `/` and `/shared/[id]` stay outside the authenticated chrome. `Header.tsx` was split back to a public-only header and the new authenticated navigation lives in `AppNav` + `AppShell`, with `UserNav` reused inside the shell rather than forked.

Representative pages were then retrofitted onto the system: `/workouts`, `/exercises`, `/analytics`, `/feed`, and `/leaderboards` now render `PageHeader`, `StatCard`, `AppCard`, and route-level hooks around their existing feature components. That gives S04 a proven pattern across list, dashboard, social, and competitive page shapes.

The slice also left behind a local runtime proof harness in `apps/web/tests/app-shell.spec.ts` and `apps/web/playwright.config.ts`. The spec targets the worktree-local server on port 3001 and checks shell chrome plus route-specific carry-through hooks, but first inspects raw HTML/body content for Clerk/auth/env blocker signatures so middleware failures are recorded as blockers instead of false shell regressions.

While closing the slice, two verification gaps from task execution were retired locally: `PageHeader` no longer collides with the intrinsic `header` element `title` prop at type level, and `apps/web` now declares `@playwright/test` so the shell proof harness typechecks and the Playwright CLI exists in the package.

## Verification

- `pnpm --filter web-app typecheck` — passed after fixing the `PageHeader` prop typing conflict and adding `@playwright/test` to `apps/web`
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts --config playwright.config.ts` — the harness now launches, starts the worktree-local Next server on port 3001, and reaches the expected runtime blocker class: Clerk middleware rejects the publishable key before page render with `Publishable key not valid.`
- Runtime blocker evidence is consistent with the slice observability contract: the truthful diagnostic surface is returned page HTML / server output, not browser console noise, because the request dies before hydration
- Observability surfaces confirmed in code: shared `data-ui` hooks on primitives/shell, route-specific `data-route*` hooks on representative pages, and the Playwright blocker-classification path in `apps/web/tests/app-shell.spec.ts`

## Requirements Advanced

- R031 — moved from unmapped to evidenced: the authenticated design-system tokens, shared shell seam, product navigation, and representative route adoption now exist in code with contract verification and a runtime proof harness ready for S04 expansion

## Requirements Validated

- None — live authenticated route proof is still blocked by Clerk middleware failing before render, so S03 advances R031 but does not validate it yet

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- Added `apps/web/playwright.config.ts` because the web package had no local Playwright harness to target the worktree server on port 3001
- Added `@playwright/test` to `apps/web/package.json` and fixed the `PageHeader` prop typing collision during slice close because the original task implementation left the slice-level verification commands failing

## Known Limitations

- Live browser proof of the authenticated shell is still blocked by Clerk middleware returning `Publishable key not valid.` before any authenticated route hydrates
- Only representative routes were retrofitted in this slice; the rest of the authenticated surface still needs S04 to fan the design system out across all remaining pages
- The Playwright run currently proves blocker classification, not successful shell rendering, because auth config fails before selectors can be asserted at runtime

## Follow-ups

- Fix the Clerk publishable-key runtime configuration so the existing app-shell Playwright harness can assert real shell selectors instead of only classifying middleware blockers
- Use the representative route pattern from this slice to refresh the remaining authenticated pages in S04 without introducing page-local wrappers or bespoke styling tokens
- Consider silencing the Next.js multiple-lockfiles warning by setting `turbopack.root` or otherwise making the worktree root explicit once the design work settles

## Files Created/Modified

- `apps/web/src/app/globals.css` — added the authenticated `app-shell` / `app-page` token namespace and semantic shell surface utilities
- `apps/web/src/app/(app)/layout.tsx` — introduced the protected-route layout seam that wraps authenticated pages in `AppShell`
- `apps/web/src/components/app-shell/AppShell.tsx` — added the shared authenticated chrome, content region, and responsive layout structure
- `apps/web/src/components/app-shell/AppNav.tsx` — added the product-focused authenticated navigation destinations
- `apps/web/src/components/app-shell/AppCard.tsx` — added reusable card surfaces with durable `data-ui` selectors
- `apps/web/src/components/app-shell/PageHeader.tsx` — added the shared page header primitive and fixed the intrinsic `title` prop typing collision
- `apps/web/src/components/app-shell/StatCard.tsx` — added reusable summary/stat surfaces for top-of-page overview rows
- `apps/web/src/components/app-shell/AppBadge.tsx` — added shared badge/pill treatments aligned to the new shell palette
- `apps/web/src/components/Header.tsx` — narrowed the existing header back to the public marketing path
- `apps/web/src/components/common/UserNav.tsx` — restyled the existing account menu for the authenticated shell and exposed relevant entry points
- `apps/web/src/app/(app)/workouts/page.tsx` — moved workouts onto the shared shell pattern with route-specific proof hooks and session entry CTA
- `apps/web/src/app/(app)/exercises/page.tsx` — moved the exercise library page onto shared shell framing with durable selectors
- `apps/web/src/app/(app)/analytics/page.tsx` — wrapped analytics in shared page/card/stat primitives with dashboard hooks
- `apps/web/src/app/(app)/feed/page.tsx` — applied the shell pattern to the social feed route
- `apps/web/src/app/(app)/leaderboards/page.tsx` — applied the shell pattern to competitive controls and rankings
- `apps/web/tests/app-shell.spec.ts` — added authenticated shell proof with route carry-through assertions and auth/env blocker classification
- `apps/web/playwright.config.ts` — added worktree-local Playwright config targeting port 3001
- `apps/web/package.json` — added `@playwright/test` so the proof harness typechecks and the CLI is available locally
- `.gsd/REQUIREMENTS.md` — recorded S03 evidence for R031
- `.gsd/DECISIONS.md` — appended the blocker-classification verification decision

## Forward Intelligence

### What the next slice should know
- S04 should treat the current representative routes as the reference implementation: reuse `PageHeader`, `AppCard`, `StatCard`, `AppBadge`, and `data-route*` hooks instead of inventing local wrappers on each remaining page
- Public and authenticated navigation are now intentionally split. Do not push authenticated destinations back into `Header.tsx`; extend `AppNav` / `AppShell` instead
- The worktree-local proof target is port 3001 via `apps/web/playwright.config.ts`, not the shared localhost:3000 server used elsewhere

### What's fragile
- Clerk runtime configuration — if the publishable key stays invalid, every authenticated-route browser check will fail before render and can masquerade as a UI regression unless you inspect the returned HTML first
- Route migration under `apps/web/src/app/(app)/` — S04 should keep URL-preserving moves consistent and avoid accidentally re-wrapping public/shared routes in the authenticated shell

### Authoritative diagnostics
- `apps/web/tests/app-shell.spec.ts` plus raw page HTML on port 3001 — this is the trustworthy signal for distinguishing auth/env middleware failure from shell wiring defects
- `pnpm --filter web-app typecheck` — catches both ordinary component typing regressions and proof-harness drift because the Playwright files are inside the web tsconfig include set

### What assumptions changed
- The plan assumption was that slice-close runtime proof would mostly be a shell-rendering exercise — in practice, the first truthful runtime result is still a Clerk middleware blocker before hydration
- The task summaries treated the missing Playwright package as a known issue — slice close fixed that, so remaining proof blockage is now the auth/runtime config, not missing tooling
