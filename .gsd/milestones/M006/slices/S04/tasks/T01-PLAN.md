# T01: Normalize remaining authenticated route shells and session layout ownership

**Goal:** Move the remaining untouched authenticated routes onto the S03 shell/page composition pattern and make the session-route ownership explicit without changing user-facing URLs.
**Why:** S04 cannot land a coherent design refresh if untouched routes still bypass `AppShell` or carry bespoke page scaffolding. This task establishes one truthful route-level seam before component reskins fan out.

## Inputs

- S03 shell primitives and route pattern: `apps/web/src/components/app-shell/*`, `apps/web/src/app/(app)/layout.tsx`
- Representative route references: `apps/web/src/app/(app)/workouts/page.tsx`, `apps/web/src/app/(app)/exercises/page.tsx`, `apps/web/src/app/(app)/analytics/page.tsx`, `apps/web/src/app/(app)/feed/page.tsx`, `apps/web/src/app/(app)/leaderboards/page.tsx`
- Untouched route targets from slice research
- Existing feature-specific `data-*` hooks that must survive route adoption

## Must-Haves

- Route-level shell adoption for `templates`, `profile/setup`, `profile/[username]`, `workouts/active`, and `exercises/[id]`
- Explicit decision for session routes that preserves `/workouts/session/[id]` and `/session/join/[inviteCode]` URLs
- Durable `data-route` / `data-route-section` hooks on all touched routes
- No auth-boundary regressions and no behavior changes beyond layout/presentation framing

## Files

- `apps/web/src/app/(app)/templates/page.tsx`
- `apps/web/src/app/(app)/profile/setup/page.tsx`
- `apps/web/src/app/(app)/profile/[username]/page.tsx`
- `apps/web/src/app/(app)/workouts/active/page.tsx`
- `apps/web/src/app/(app)/exercises/[id]/page.tsx`
- `apps/web/src/app/workouts/session/[id]/page.tsx`
- `apps/web/src/app/session/join/[inviteCode]/page.tsx`
- `apps/web/src/app/(app)/layout.tsx`

## Steps

1. Compare each untouched route to the S03 representative-route pattern and identify the minimal route-level framing needed: `PageHeader`, summary rows, `AppCard` boundaries, and `data-route*` attributes.
2. Retrofit `templates`, `profile/setup`, `profile/[username]`, `workouts/active`, and `exercises/[id]` to that pattern without moving feature logic into route files or dropping existing child component hooks.
3. Make the session-layout decision explicit: if `workouts/session/[id]` needs to move under `/(app)` to inherit the shell, do so in a URL-preserving way; for `/session/join/[inviteCode]`, either keep it outside the route group with shared shell primitives or otherwise implement a deliberate protected join-flow treatment. Preserve URLs and auth protection.
4. Add/keep stable `data-route` and `data-route-section` hooks for each page so later Playwright proof can assert route identity without relying on copy.
5. Run typecheck and fix any route-group/import issues introduced by moves or shell adoption.

## Verification

- `pnpm --filter web-app typecheck`

## Expected Output

- All untouched authenticated route files render through the shared S03 page-shell vocabulary
- Session routes have an explicit ownership model documented in code by their placement/composition, with URLs unchanged
- Each touched route exposes durable selectors needed by S04 runtime proof

## Done When

- The remaining route files no longer use standalone gray-page scaffolding
- URL behavior for `/workouts/session/[id]` and `/session/join/[inviteCode]` is preserved
- TypeScript passes for the web app

## Observability Impact

- Preserves and extends route-level `data-route` / `data-route-section` selectors so runtime proof can distinguish route-shell regressions from feature-component issues
- Any auth/env runtime failure must still be diagnosable via the existing blocker-classification path rather than missing-selector noise
