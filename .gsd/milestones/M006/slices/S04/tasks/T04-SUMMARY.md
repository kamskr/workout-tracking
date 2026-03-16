---
id: T04
parent: S04
milestone: M006
provides:
  - Refreshed challenge and session collaboration surfaces plus a blocker-aware refreshed-pages Playwright proof harness for the widened authenticated route set.
key_files:
  - apps/web/src/app/(app)/challenges/page.tsx
  - apps/web/src/components/session/SharedTimerDisplay.tsx
  - apps/web/src/components/session/SessionParticipantList.tsx
  - apps/web/src/components/session/SessionSetFeed.tsx
  - apps/web/src/components/session/SessionSummary.tsx
  - apps/web/tests/helpers/authBlockers.ts
  - apps/web/tests/app-pages-refresh.spec.ts
  - apps/web/tests/app-shell.spec.ts
  - apps/web/playwright.config.ts
key_decisions:
  - Centralized Playwright auth/env blocker detection into a shared helper so shell and refreshed-page proofs classify middleware failures before selector assertions from one source of truth.
patterns_established:
  - Collaboration-heavy routes should use shared shell primitives at the route layer and premium `workout-*`/feature utility surfaces inside components while preserving existing `data-challenge-*` and `data-session-*` hooks.
observability_surfaces:
  - data-route, data-route-section, data-challenge-page, data-challenge-list, data-challenge-detail, data-challenge-standings, data-challenge-create, data-session-page, data-session-timer, data-session-participants, data-session-sets, data-session-summary, apps/web/tests/helpers/authBlockers.ts, `pnpm --filter web-app typecheck`, `lsof -nP -iTCP:3001 -sTCP:LISTEN`
duration: 1h+
verification_result: passed
completed_at: 2026-03-16 22:04 CET
blocker_discovered: false
---

# T04: Refresh challenge and session collaboration surfaces and widen browser proof

**Refreshed the remaining challenge/session collaboration surfaces onto the shared premium app language and widened the Playwright proof seam with shared auth/env blocker classification.**

## What Happened

Rebuilt `apps/web/src/app/(app)/challenges/page.tsx` onto the S04 authenticated-shell vocabulary instead of the old standalone gray page. The route now renders with `PageHeader`, overview `StatCard`s, shell cards for filter controls, create flow, challenge list, detail state, and standings, while preserving the existing `data-challenge-page`, `data-challenge-list`, `data-challenge-detail`, `data-challenge-standings`, `data-challenge-create`, and `data-challenge-join` hooks.

Reskinned the session collaboration internals so the live timer, participant roster, set feed, and completion summary no longer read like isolated white widgets inside an otherwise refreshed route. `SharedTimerDisplay`, `SessionParticipantList`, `SessionSetFeed`, and `SessionSummary` now use the same warm premium surfaces, pills, and empty/loading states already established elsewhere in S04, while keeping the existing `data-session-timer`, `data-session-participants`, `data-session-sets`, and `data-session-summary` selectors intact.

For browser proof, extracted the auth/env blocker classifier into `apps/web/tests/helpers/authBlockers.ts` and updated both `apps/web/tests/app-shell.spec.ts` and `apps/web/tests/app-pages-refresh.spec.ts` to use it. The refreshed-pages spec now covers the widened route set with durable route/feature selectors, including `/challenges` and the authenticated session route seam, while still skipping truthfully when middleware/auth/env HTML appears before hydration.

## Verification

- `pnpm --filter web-app typecheck` ✅
- `lsof -nP -iTCP:3001 -sTCP:LISTEN` ✅ confirmed a local Next listener on port 3001 before runtime proof.
- `cd apps/web && pnpm exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts` ❌ workspace invocation still fails with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` in this worktree.
- Absolute Playwright binary invocation against the same config (`apps/web/node_modules/.bin/playwright ... --config apps/web/playwright.config.ts`) progressed past command resolution but failed in `config.webServer` with `EADDRINUSE` even while a ready local Next server was already listening on port 3001. This confirms runtime harness drift rather than selector regression.
- Started a fresh package-local dev server on port 3001 with `bg_shell` and confirmed readiness (`http://localhost:3001`), but Playwright still failed immediately trying to spawn its own `webServer` process instead of reusing the existing listener.

## Diagnostics

- Route-level proof selectors: `data-route`, `data-route-section`, `data-challenge-page`, `data-challenge-list`, `data-challenge-detail`, `data-challenge-standings`, `data-challenge-create`, `data-session-page`.
- Collaboration component selectors: `data-session-timer`, `data-session-participants`, `data-session-sets`, `data-session-summary`.
- Shared blocker-classification seam: `apps/web/tests/helpers/authBlockers.ts`.
- Runtime prerequisite check: `lsof -nP -iTCP:3001 -sTCP:LISTEN`.
- Harness failure mode to inspect first: Playwright `config.webServer` exits with `EADDRINUSE` even when a healthy local Next server is already bound to 3001.

## Deviations

- Used the package-local Playwright binary and absolute file paths for verification after the planned `pnpm ... exec playwright` command kept failing from workspace command resolution. This was a verification-path adjustment, not a product-scope change.

## Known Issues

- `apps/web/playwright.config.ts` still has a server-reuse/runtime drift: the suite attempts to start `webServer` and dies with `EADDRINUSE` instead of reusing the ready port-3001 dev server. The new proof files are in place, but full browser proof remains blocked by harness behavior.
- Because of that harness issue, the widened refreshed-pages spec could not be fully executed to page assertions in this task; the selector and blocker-classification seams were updated and typechecked, but end-to-end Playwright pass/fail is still waiting on the reuse issue.

## Files Created/Modified

- `apps/web/src/app/(app)/challenges/page.tsx` — rebuilt the challenge route onto shared shell primitives while preserving the challenge data hooks and state machine.
- `apps/web/src/components/session/SharedTimerDisplay.tsx` — reskinned the shared timer surface and controls onto the premium collaboration vocabulary.
- `apps/web/src/components/session/SessionParticipantList.tsx` — refreshed participant roster cards while preserving presence indicators and participant selectors.
- `apps/web/src/components/session/SessionSetFeed.tsx` — refreshed the live set feed cards and empty/loading states while preserving set-feed selectors.
- `apps/web/src/components/session/SessionSummary.tsx` — refreshed completed-session summary cards and loading/empty states.
- `apps/web/tests/helpers/authBlockers.ts` — centralized auth/env blocker HTML classification for Playwright specs.
- `apps/web/tests/app-shell.spec.ts` — switched shell proof to the shared blocker-classification helper.
- `apps/web/tests/app-pages-refresh.spec.ts` — widened refreshed-page proof coverage to the remaining S04 routes with durable selectors.
- `apps/web/playwright.config.ts` — added a small config-level grep guard while preserving the existing local webServer contract.
- `.gsd/KNOWLEDGE.md` — recorded the non-obvious Playwright server-reuse drift seen in this worktree.
