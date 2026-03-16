# S04: App Pages Design Refresh

**Goal:** Extend the S03 authenticated design system across the remaining internal web product surface so all untouched authenticated routes and their feature components share the Apple Fitness+ visual language, durable route hooks, and shell composition seam.
**Demo:** Signed-in users can move across templates, challenges, profile, active workout, exercise detail, and session flows without dropping back to pre-refresh gray/white standalone UI; each page renders inside the authenticated shell with polished headers, premium cards, warm gradients, and stable verification hooks.

## Must-Haves

- All remaining authenticated routes adopt the S03 shell/page pattern: `templates`, `challenges`, `profile/setup`, `profile/[username]`, `workouts/active`, `exercises/[id]`, and the session routes at `/workouts/session/[id]` and `/session/join/[inviteCode]`.
- Session route ownership is made explicit without changing public URLs: authenticated session surfaces inherit the shell where appropriate and invite-join flow has a deliberate visual treatment instead of an accidental pre-refresh holdout.
- Feature components under templates, profile, workout, exercise-detail, and session domains are reskinned to use shared app-shell primitives/tokens instead of local gray/white card styling.
- Existing S03-refreshed representative pages are tightened where their inner components still look old, especially workout history/card surfaces.
- Route-level observability remains intact or improves: `data-route`, `data-route-section`, and feature-specific `data-*` hooks stay usable for runtime proof.
- Slice proof covers both contract and runtime blocker classification for the widened authenticated surface, advancing R031 through S04 support.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `pnpm --filter web-app typecheck`
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts`
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts --config playwright.config.ts --grep "auth/env blocker"`
- `lsof -nP -iTCP:3001 -sTCP:LISTEN`
- `cd apps/web && pnpm exec playwright test tests/app-shell.spec.ts --config playwright.config.ts --grep "auth/env blocker"`
- `cd apps/web && pnpm exec playwright test tests/app-pages-refresh.spec.ts --config playwright.config.ts --grep "auth/env blocker|refresh surfaces"`

## Observability / Diagnostics

- Runtime signals: route-level `data-route`, `data-route-section`, and existing feature-specific `data-profile-*`, `data-badge-*`, `data-session-*`, `data-challenge-*`, `data-pr-badge`, `data-leaderboard-*` selectors carried through refreshed pages and components.
- Inspection surfaces: `apps/web/tests/app-shell.spec.ts`, new `apps/web/tests/app-pages-refresh.spec.ts`, worktree-local browser runtime on port 3001, and raw page HTML when Clerk middleware fails before hydration.
- Failure visibility: Playwright specs must classify Clerk/auth/env blocker HTML before asserting UI selectors so executor agents can distinguish middleware failure from page regressions.
- Redaction constraints: do not surface Clerk or Convex secret values; report only blocker class and failing page/selector.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/app/globals.css`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/app-shell/*`, representative route patterns from `/workouts`, `/exercises`, `/analytics`, `/feed`, and `/leaderboards`, plus existing feature data-attribute contracts.
- New wiring introduced in this slice: shell adoption for the remaining authenticated routes, URL-preserving session-route layout normalization, domain component reskins, and a widened authenticated-route Playwright proof surface.
- What remains before the milestone is truly usable end-to-end: S05 live backend verification/fixes and S06 Expo/iOS runtime testing.

## Tasks

- [x] **T01: Normalize remaining authenticated route shells and session layout ownership** `est:1h`
  - Why: S04 needs one truthful composition seam before deep styling work. Untouched routes and session pages still bypass or underuse the S03 shell, which would make downstream design work inconsistent and verification brittle.
  - Files: `apps/web/src/app/(app)/templates/page.tsx`, `apps/web/src/app/(app)/profile/setup/page.tsx`, `apps/web/src/app/(app)/profile/[username]/page.tsx`, `apps/web/src/app/(app)/workouts/active/page.tsx`, `apps/web/src/app/(app)/exercises/[id]/page.tsx`, `apps/web/src/app/workouts/session/[id]/page.tsx`, `apps/web/src/app/session/join/[inviteCode]/page.tsx`, `apps/web/src/app/(app)/layout.tsx`
  - Do: Retrofit each untouched authenticated route to the S03 composition pattern with `PageHeader`, `AppCard`/`StatCard`, warm overview rows, and stable `data-route*` hooks. Make an explicit URL-preserving decision for the session routes: move `workouts/session/[id]` under the authenticated route-group seam if needed so it inherits `AppShell`, and deliberately keep or adapt `/session/join/[inviteCode]` as a protected join flow with shared primitives rather than bespoke gray UI. Preserve existing behavior, auth gating, and route URLs.
  - Verify: `pnpm --filter web-app typecheck`
  - Done when: all remaining route files compose through the authenticated design system, URLs are unchanged, and every refreshed route exposes durable route-level selectors for later runtime proof.
- [x] **T02: Refresh templates and profile surfaces onto shared primitives** `est:1h`
  - Why: Templates and profile flows still carry strong pre-refresh styling debt in reusable components. Reskinning these domains closes a visible share of the product surface and prevents route wrappers from masking old internals.
  - Files: `apps/web/src/components/templates/TemplateList.tsx`, `apps/web/src/components/templates/TemplateCard.tsx`, `apps/web/src/components/profile/ProfileSetupForm.tsx`, `apps/web/src/components/profile/ProfileStats.tsx`, `apps/web/src/components/profile/BadgeDisplay.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/app-shell/AppCard.tsx`
  - Do: Replace local white-card/gray-background patterns with shared app-shell treatments and any missing feature-surface utilities in `globals.css`. Consolidate profile stats and badge surfaces onto the shell card/stat vocabulary where practical, keep `data-profile-*` and `data-badge-*` hooks intact, and ensure loading/empty/edit states match the premium Apple Fitness+ direction rather than default dashboard gray.
  - Verify: `pnpm --filter web-app typecheck`
  - Done when: templates and profile pages inherit the same premium language as S03 representative routes, component-level old styling is removed, and existing feature hooks still give truthful runtime selectors.
- [x] **T03: Refresh workout and exercise detail internals for premium active-use flows** `est:1h`
  - Why: The workout and exercise-detail routes are high-frequency surfaces; route framing alone is not enough if workout cards, active set rows, history, and progress containers still look like pre-refresh MVP UI.
  - Files: `apps/web/src/components/workouts/ActiveWorkout.tsx`, `apps/web/src/components/workouts/WorkoutHistory.tsx`, `apps/web/src/components/workouts/WorkoutCard.tsx`, `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `apps/web/src/components/workouts/WorkoutExerciseList.tsx`, `apps/web/src/components/exercises/ExerciseProgressChart.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/(app)/exercises/[id]/page.tsx`
  - Do: Reskin workout history, active workout, set-entry, superset grouping, and exercise-detail chart/instruction wrappers to use shared surface classes, richer hierarchy, and warm accent treatments while preserving existing workout logic and observability hooks like `data-pr-badge`. Tighten representative `/workouts` internals as part of this task so S03 shell adoption is matched by component-level polish.
  - Verify: `pnpm --filter web-app typecheck`
  - Done when: workout history, active workout, and exercise detail no longer visually fall back to old gray/white cards, and the shared shell language is consistent across browse, log, and detail flows.
- [x] **T04: Refresh challenge and session collaboration surfaces and widen browser proof** `est:1h`
  - Why: Challenges and live sessions are the busiest/most stateful pages left. They also need the strongest runtime proof because they combine dense UI with route-boundary decisions and existing blocker-classification behavior.
  - Files: `apps/web/src/app/(app)/challenges/page.tsx`, `apps/web/src/components/session/SharedTimerDisplay.tsx`, `apps/web/src/components/session/SessionParticipantList.tsx`, `apps/web/src/components/session/SessionSetFeed.tsx`, `apps/web/src/components/session/SessionSummary.tsx`, `apps/web/tests/app-shell.spec.ts`, `apps/web/tests/app-pages-refresh.spec.ts`, `apps/web/playwright.config.ts`
  - Do: Apply the premium shell vocabulary to challenge list/detail/create states and session participant/feed/timer/summary components without regressing existing `data-challenge-*` and `data-session-*` selectors. Add or extend Playwright coverage so the widened route set is asserted through durable selectors, but preserve the S03 auth/env blocker-classification pattern before any shell/page assertions run.
  - Verify: `pnpm --filter web-app typecheck && pnpm --filter web-app exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts`
  - Done when: challenge and session surfaces visually align with the rest of the authenticated app, a dedicated refreshed-pages proof file exists, and runtime verification either passes against rendered pages or truthfully reports auth/env blocker class instead of selector noise.

## Files Likely Touched

- `apps/web/src/app/globals.css`
- `apps/web/src/app/(app)/templates/page.tsx`
- `apps/web/src/app/(app)/challenges/page.tsx`
- `apps/web/src/app/(app)/profile/setup/page.tsx`
- `apps/web/src/app/(app)/profile/[username]/page.tsx`
- `apps/web/src/app/(app)/workouts/active/page.tsx`
- `apps/web/src/app/(app)/exercises/[id]/page.tsx`
- `apps/web/src/app/workouts/session/[id]/page.tsx`
- `apps/web/src/app/session/join/[inviteCode]/page.tsx`
- `apps/web/src/components/templates/TemplateList.tsx`
- `apps/web/src/components/templates/TemplateCard.tsx`
- `apps/web/src/components/profile/ProfileSetupForm.tsx`
- `apps/web/src/components/profile/ProfileStats.tsx`
- `apps/web/src/components/profile/BadgeDisplay.tsx`
- `apps/web/src/components/workouts/ActiveWorkout.tsx`
- `apps/web/src/components/workouts/WorkoutHistory.tsx`
- `apps/web/src/components/workouts/WorkoutCard.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx`
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx`
- `apps/web/src/components/session/SharedTimerDisplay.tsx`
- `apps/web/src/components/session/SessionParticipantList.tsx`
- `apps/web/src/components/session/SessionSetFeed.tsx`
- `apps/web/src/components/session/SessionSummary.tsx`
- `apps/web/tests/app-shell.spec.ts`
- `apps/web/tests/app-pages-refresh.spec.ts`
- `apps/web/playwright.config.ts`
