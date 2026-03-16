# S04: App Pages Design Refresh — UAT

**Milestone:** M006
**Written:** 2026-03-16

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: this slice is mostly visual/runtime shell work, but the current worktree runtime still blocks full rendered-page proof. The right UAT for S04 is a mix of artifact-driven checks (selector contracts, route-shell composition, blocker-aware test execution) plus live-runtime checks once the authenticated app runtime is healthy.

## Preconditions

- Worktree-local web app is running on port 3001 from `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`
- Use the same server for all S04 checks: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001`
- User is authenticated or the runtime blocker is classified truthfully before selector assertions
- Convex/Clerk env is present enough for authenticated routes to attempt render, even if they currently fail before hydration

## Smoke Test

Run:

`cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 pnpm exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts`

**Pass condition:** the suite either reaches the refreshed route selectors or skips with a truthful auth/env/build blocker classification instead of failing on missing selectors.

## Test Cases

### 1. Templates page uses the refreshed authenticated shell

1. Open `/templates` on the worktree server.
2. Confirm the page is inside the authenticated shell (`data-ui="app-shell"`) or is skipped by blocker classification.
3. If rendered, confirm `data-route="templates"` is present.
4. If rendered, confirm `data-route-section="templates-overview"` and `data-route-section="templates-list"` are present.
5. If rendered, confirm the template list still exposes `data-template-list`.
6. **Expected:** the route renders with premium shell framing and durable selectors, or the proof reports a blocker before any selector assertions.

### 2. Profile setup and profile view preserve their feature hooks inside the new shell

1. Open `/profile/setup`.
2. If rendered, confirm `data-route="profile-setup"`, `data-route-section="profile-setup-overview"`, and `data-route-section="profile-setup-form"`.
3. If rendered, confirm the setup form still exposes `data-profile-setup-form`.
4. Open `/profile/test-user`.
5. If rendered, confirm `data-route="profile-view"` plus route sections for overview, badges, and stats.
6. If rendered, confirm `data-badge-section` and `data-profile-stats` still exist.
7. **Expected:** both profile routes inherit the new shell language without losing badge/profile selectors.

### 3. Workout active flow and exercise detail no longer drop to the old card style

1. Open `/workouts/active`.
2. If rendered, confirm `data-route="workouts-active"` with overview and flow sections.
3. If rendered, confirm active workout internals still expose `data-active-workout`, `data-workout-exercise-list`, and `data-workout-exercise-item`.
4. Open an exercise detail route with existing data.
5. If rendered, confirm the route shell is present and `data-pr-badge` still appears when appropriate.
6. **Expected:** the active logging/detail surfaces sit inside the shared premium shell and keep workout/exercise diagnostic hooks intact.

### 4. Challenges page keeps its dense stateful hooks after the refresh

1. Open `/challenges`.
2. If rendered, confirm `data-route="challenges"` plus `data-route-section="challenges-overview"`, `data-route-section="challenges-controls"`, and `data-route-section="challenges-list-card"`.
3. If rendered, confirm `data-challenge-page` and `data-challenge-list` are visible.
4. Exercise at least one challenge state (detail or create) if runtime is healthy.
5. **Expected:** challenge overview/list/detail/create surfaces use the refreshed shell vocabulary while keeping the existing challenge data hooks.

### 5. Session workout route keeps its public URL and shared implementation

1. Open `/workouts/session/test-session`.
2. If rendered, confirm `data-route="session-workout"` and `data-session-page` are present.
3. If rendered, confirm at least the overview section renders and that session internals keep `data-session-timer`, `data-session-participants`, `data-session-sets`, or `data-session-summary` depending on state.
4. Open `/session/join/test-invite`.
5. If rendered, confirm it uses the refreshed shell primitives and still behaves as a dedicated join flow rather than inheriting the authenticated shell accidentally.
6. **Expected:** session workout URLs remain unchanged, the authenticated session page uses the shared implementation seam, and session-specific hooks survive the design refresh.

## Edge Cases

### Runtime blocker before hydration

1. Run the two Playwright suites against port 3001 with `PLAYWRIGHT_BASE_URL` set.
2. Observe whether the page returns a Clerk/env failure or Next build overlay before render.
3. **Expected:** the tests skip with a blocker annotation instead of failing on missing `data-ui="app-shell"` or route selectors.

### Session route ownership regression

1. Load `/workouts/session/test-session` after any routing/layout change.
2. Check the browser/dev overlay or `error-context.md` if the page does not render.
3. **Expected:** no “two parallel pages that resolve to the same path” build error appears. If it does, the session implementation seam has regressed back toward route-level aliasing.

## Failure Signals

- Playwright fails on missing shell selectors without an auth/env/build blocker annotation
- Next dev overlay shows route collision or build error instead of page render
- `pnpm --filter web-app typecheck` fails
- `data-route`, `data-route-section`, `data-session-*`, `data-challenge-*`, `data-profile-*`, `data-badge-*`, `data-pr-badge`, or `data-workout-*` hooks disappear from rendered pages
- Playwright tries to start its own server and fails with `EADDRINUSE` instead of reusing port 3001

## Requirements Proved By This UAT

- R031 — proves the refreshed authenticated routes and feature domains expose one cohesive shell/selector contract and can be runtime-checked in blocker-aware mode

## Not Proven By This UAT

- Final human visual quality once the authenticated runtime is fully healthy
- End-to-end authenticated interaction on the refreshed pages under a clean runtime
- Backend correctness for M003–M005 features (belongs to S05)
- Mobile runtime behavior (belongs to S06)

## Notes for Tester

Use the worktree-local server, not a shared localhost checkout. If Playwright fails immediately with selector errors, inspect `apps/web/tests/helpers/authBlockers.ts` and the latest `apps/web/test-results/*/error-context.md` first. In this worktree, truthful blocker classification is part of the slice contract — a skipped test with a real blocker is better evidence than a false selector failure.
