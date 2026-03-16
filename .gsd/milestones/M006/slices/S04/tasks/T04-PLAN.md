# T04: Refresh challenge and session collaboration surfaces and widen browser proof

**Goal:** Finish the remaining collaboration-heavy UI refresh and leave S04 with a truthful browser-proof harness that covers the widened authenticated page set while still classifying auth/env blockers correctly.
**Why:** Challenges and sessions are dense, stateful surfaces with the highest risk of “looks refreshed at the route level, old inside” drift. They also need explicit runtime proof because selector-only checks become misleading when Clerk middleware fails before hydration.

## Inputs

- T01 route-shell adoption and session-route ownership
- Existing challenge/session `data-*` hooks from M004/M005
- S03 blocker-classification Playwright pattern in `apps/web/tests/app-shell.spec.ts`

## Must-Haves

- Challenge create/list/detail states align visually with the S03/S04 design language
- Session timer, participant list, set feed, and summary components align visually with the same system
- Existing `data-challenge-*` and `data-session-*` hooks stay intact
- A dedicated refreshed-pages Playwright proof file exists and follows the same blocker-classification contract before UI assertions

## Files

- `apps/web/src/app/(app)/challenges/page.tsx`
- `apps/web/src/components/session/SharedTimerDisplay.tsx`
- `apps/web/src/components/session/SessionParticipantList.tsx`
- `apps/web/src/components/session/SessionSetFeed.tsx`
- `apps/web/src/components/session/SessionSummary.tsx`
- `apps/web/tests/app-shell.spec.ts`
- `apps/web/tests/app-pages-refresh.spec.ts`
- `apps/web/playwright.config.ts`

## Steps

1. Reskin challenge page states (filters, create form, list cards, detail panel, standings) using the shared shell vocabulary while preserving the page’s existing state machine and data attributes.
2. Reskin session feature components so waiting/active/completed collaboration states feel like part of the same product system, not isolated white widgets.
3. Add a new Playwright spec for refreshed internal pages, or extend the shell spec only if the result stays readable; either way, preserve the S03 pattern of detecting Clerk/auth/env blocker HTML before asserting selectors.
4. Cover the widened route set with durable selectors from T01–T03 instead of copy-based assertions, and keep proofs targeted to shell/page composition rather than business logic already covered elsewhere.
5. Run the combined slice verification command and fix either typing drift or proof harness drift until the outcome is either pass or truthful auth/env blocker classification.

## Verification

- `pnpm --filter web-app typecheck`
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts`

## Expected Output

- Challenge and session collaboration surfaces are visually aligned with the rest of the refreshed authenticated app
- Browser proof now covers the widened S04 route set with stable selectors and blocker-aware diagnostics
- The slice leaves behind a truthful runtime verification seam for S05 and milestone-close UAT

## Done When

- Challenge/session pages no longer visually fall back to pre-refresh components
- A dedicated refreshed-pages Playwright proof file exists and runs under the local web package config
- Verification either passes against rendered pages or correctly reports auth/env blocker class before selector assertions

## Observability Impact

- Extends runtime inspection from representative routes to the full refreshed internal surface via stable page/feature selectors
- Keeps raw-page blocker classification as the authoritative first check when middleware dies before hydration, preventing false UI debugging
