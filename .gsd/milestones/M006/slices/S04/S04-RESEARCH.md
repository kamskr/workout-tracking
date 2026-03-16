# S04 — Research

**Date:** 2026-03-16

## Summary

S04 is mostly systematic fan-out of the S03 shell and token work, not new architecture. The main gap is coverage: representative authenticated routes (`/workouts`, `/exercises`, `/analytics`, `/feed`, `/leaderboards`) already use `AppShell`, `PageHeader`, `AppCard`, `StatCard`, `AppBadge`, and route-level `data-route*` hooks, but the rest of the authenticated product surface still renders as pre-refresh gray standalone pages. The untouched routes are `/(app)/templates`, `/(app)/challenges`, `/(app)/profile/setup`, `/(app)/profile/[username]`, `/(app)/workouts/active`, `/(app)/exercises/[id]`, plus the session routes still living outside the authenticated route group: `/workouts/session/[id]` and `/session/join/[inviteCode]`.

The heavier design debt sits in feature components, not only the route files. Templates, profile, active workout, exercise detail, and session components still carry local white-card/gray-background styling and duplicated mini-stat/card patterns. S04 should therefore split into two layers: first retrofit the remaining route files onto the S03 shell pattern with consistent headers/overview rows/section hooks, then reskin the reusable feature components so pages inherit the premium look instead of each page wrapping old components in a prettier container.

The runtime verification boundary from S03 still applies unchanged: worktree-local browser proof should use port 3001, and Clerk publishable-key middleware failures must be classified as auth/env blockers before any selector failure is treated as a design bug. S04 can still close useful contract proof with `pnpm --filter web-app typecheck`, but truthful runtime UI proof depends on the existing blocker-classification harness pattern rather than ad hoc browser clicking.

## Recommendation

Treat S04 as a structured rollout of the S03 design system across the remaining authenticated routes and their feature components.

Build in this order:
1. **Route boundary cleanup first** — move/normalize any authenticated routes that are still outside `apps/web/src/app/(app)/` where safe, especially `workouts/session/[id]`; keep `/session/join/[inviteCode]` protected but decide explicitly whether it should remain a special invite flow outside the shell or be folded into the shell. This gives the rest of the work one truthful layout seam.
2. **Page-level adoption second** — retrofit each untouched route to `PageHeader` + `AppCard`/`StatCard` + route hooks. That establishes consistent top-level composition quickly and gives planners clean task boundaries per domain.
3. **Feature-component reskin third** — update templates, profile, workout, exercise-detail, and session components to consume shell styling instead of raw `bg-white border-gray-200 shadow-sm` patterns. This is where the premium feel actually lands.
4. **Proof last** — extend the existing route-hook/browser-proof pattern rather than inventing screenshot-driven verification.

This keeps S04 reversible and measurable: shell adoption is visible at the route file level, while component skinning can be divided by domain without re-litigating layout structure each time.

## Implementation Landscape

### Key Files

- `apps/web/src/app/globals.css` — S03’s authenticated token namespace (`--color-app-shell-*`, `.app-shell-*`, `.app-page-*`). S04 should extend this with additional feature-surface utilities instead of scattering new gradients/borders inside route files.
- `apps/web/src/app/(app)/layout.tsx` — the authenticated layout seam. All protected page refresh work should flow through this seam rather than reintroducing bespoke wrappers.
- `apps/web/src/components/app-shell/AppShell.tsx` — shared chrome and content region; authoritative shell composition boundary.
- `apps/web/src/components/app-shell/PageHeader.tsx` — the established hero/header primitive for authenticated pages. Untouched routes should adopt this rather than custom `<h1>` blocks.
- `apps/web/src/components/app-shell/AppCard.tsx` — shared card container with tone/padding variants. Best replacement for most `rounded-xl border border-gray-200 bg-white shadow-sm` blocks.
- `apps/web/src/components/app-shell/StatCard.tsx` — shared summary metric surface used by representative pages. Prefer this over local ad hoc stats.
- `apps/web/src/components/app-shell/AppBadge.tsx` — established pill treatment for page metadata and filters.
- `apps/web/src/app/(app)/templates/page.tsx` — still a plain gray page with local header/action row; straightforward shell retrofit target.
- `apps/web/src/app/(app)/challenges/page.tsx` — largest untouched authenticated route. Contains its own filters, create form, list/detail flow, and many hardcoded gray/blue utility choices. Good candidate for a dedicated task.
- `apps/web/src/app/(app)/profile/[username]/page.tsx` — untouched profile page with inline edit mode, follow button, leaderboard opt-in, badges, and stats; needs both page-shell adoption and component reskinning.
- `apps/web/src/app/(app)/profile/setup/page.tsx` — pre-refresh onboarding page using a simple centered card. Should adopt shell language while preserving `data-profile-setup-form` from the child component.
- `apps/web/src/app/(app)/workouts/active/page.tsx` — currently only wraps `ActiveWorkout` in a gray container; needs route-level framing.
- `apps/web/src/app/(app)/exercises/[id]/page.tsx` — untouched detail page with local `PeriodSelector`, PR summary cards, instructions, and chart container. Likely needs both route and feature refresh.
- `apps/web/src/app/workouts/session/[id]/page.tsx` — protected route but still outside `(app)`; currently full-page bespoke session UI. Important architectural seam for S04 because it bypasses the shell.
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — protected join-flow route outside `(app)`. Decide whether to keep invite flows visually special or align them with shell primitives.
- `apps/web/src/components/templates/TemplateList.tsx` — loading/empty/grid states still use gray-page conventions. Keeps route file thin, so skinning here affects most of `/templates`.
- `apps/web/src/components/templates/TemplateCard.tsx` — strong example of old card styling and imperative alert/confirm actions. Visual refresh belongs here, not only in the page file.
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — form semantics and validation are good; styling is fully local and can be upgraded without changing behavior.
- `apps/web/src/components/profile/ProfileStats.tsx` — duplicates a local `StatCard` instead of using shared `app-shell/StatCard`; obvious consolidation/reskin candidate.
- `apps/web/src/components/profile/BadgeDisplay.tsx` — local badge cards and empty states; should align with shell card treatments.
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — chart logic is sound; only its loading/empty wrappers and surrounding container need design work.
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — orchestrates active workout state; contains no page shell and composes feature-heavy children. Good seam for workout-domain skinning.
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — already under a refreshed route, but its own action row/loading/empty/grid patterns still use old styling; S04 should bring representative-route internals up to the same standard.
- `apps/web/src/components/workouts/WorkoutCard.tsx` — core history card still fully old-style; changing this lifts `/workouts` quality materially.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — central active-workout card with previous performance, PR badges, rest config, sets, and actions. High-value component skinning seam.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — contains superset containers, empty state, and CTA row; needs shell-consistent grouping treatments.
- `apps/web/src/components/session/SharedTimerDisplay.tsx` — bespoke white card for the shared rest timer. S04 can restyle without touching its timer logic.
- `apps/web/src/components/session/SessionParticipantList.tsx` — local list card styling; ideal feature-level reskin.
- `apps/web/src/components/session/SessionSetFeed.tsx` — same pattern for live feed cards.
- `apps/web/src/components/session/SessionSummary.tsx` — same pattern for post-session summary cards.
- `apps/web/tests/app-shell.spec.ts` — existing blocker-aware authenticated runtime proof harness. S04 should extend this pattern or add a sibling spec, not invent a separate proof strategy.
- `apps/web/playwright.config.ts` — already targets the worktree-local app on port 3001.

### Build Order

1. **Confirm authenticated route ownership and layout seam**
   - Inspect whether `apps/web/src/app/workouts/session/[id]/page.tsx` should be moved under `apps/web/src/app/(app)/workouts/session/[id]/page.tsx` to inherit `AppShell` without changing the URL.
   - Make an explicit decision for `apps/web/src/app/session/join/[inviteCode]/page.tsx`: either keep it as a special join-flow page outside shell or move it under a protected shell-compatible seam.
   - This is the one architecture-sensitive step; it unblocks all downstream UI work.

2. **Retrofit untouched route files onto the S03 page pattern**
   - Priority set: `templates`, `profile/setup`, `profile/[username]`, `workouts/active`, `exercises/[id]`, `challenges`, session page(s).
   - Add `data-route`, `data-route-section`, and route-specific hooks while composing `PageHeader`, `StatCard`, and `AppCard` around existing feature content.
   - This creates fast visible consistency and a clean verification surface before deep component styling.

3. **Reskin feature components by domain**
   - **Templates/Profile domain:** `TemplateList`, `TemplateCard`, `ProfileSetupForm`, `ProfileStats`, `BadgeDisplay`.
   - **Workout/Exercise domain:** `ActiveWorkout`, `WorkoutHistory`, `WorkoutCard`, `WorkoutExerciseItem`, `WorkoutExerciseList`, detail-page PR summary/picker wrappers.
   - **Session/Challenge domain:** session components plus challenge page local subcomponents (`CreateChallengeForm`, `ChallengeDetail`, filter pills, list cards, standings table), which currently all live inside the page file.
   - This is the natural planner split because the domains are largely independent once the route shells exist.

4. **Tighten representative pages already touched in S03 where internals still look old**
   - `/workouts` route shell is done, but `WorkoutHistory` and `WorkoutCard` still drag old visuals through the new frame.
   - `/analytics`, `/feed`, `/leaderboards`, `/exercises` route shells likely need only minor consistency passes compared to the untouched routes.

5. **Verification and blocker classification**
   - Extend Playwright/browser proof only after the route hooks are in place.
   - Runtime verification remains subordinate to Clerk middleware health.

### Verification Approach

- `pnpm --filter web-app typecheck`
  - Primary contract gate for S04 because route moves, shared primitive adoption, and inline page subcomponent refactors are type-sensitive.
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts --config playwright.config.ts`
  - Reuse the existing blocker-aware authenticated shell proof. If S04 adds additional routes/selectors, extend this spec or add a sibling spec under the same config.
- Worktree-local browser verification on `http://localhost:3001`
  - Use the worktree server, not the shared `:3000` server. If Clerk middleware returns `_error` / invalid publishable key HTML, record as auth blocker instead of a page-design failure.
- Route-level observability
  - Preserve or add `data-route`, `data-route-section`, and existing feature-specific data attributes (`data-profile-*`, `data-badge-*`, `data-session-*`, `data-challenge-*`, `data-leaderboard-*`, `data-pr-badge`) so proof can target durable selectors.

## Constraints

- S03 established `apps/web/src/app/(app)/` as the authenticated shell seam; S04 should extend that seam, not bypass it with page-local full-screen wrappers.
- `/` and `/shared/[id]` must remain outside the authenticated shell path.
- Session and join URLs already exist as `/workouts/session/[id]` and `/session/join/[inviteCode]`; any file moves must preserve those URLs.
- Many feature pages are `