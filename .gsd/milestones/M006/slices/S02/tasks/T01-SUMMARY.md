---
id: T01
parent: S02
milestone: M006
provides:
  - Workout-specific public shell branding and CTA routing on the landing page without visible `/notes` links in task-scoped shared surfaces
key_files:
  - apps/web/src/components/Header.tsx
  - apps/web/src/components/common/Logo.tsx
  - apps/web/src/components/common/UserNav.tsx
  - apps/web/src/components/home/Footer.tsx
  - .gsd/milestones/M006/slices/S02/tasks/T01-PLAN.md
key_decisions:
  - Kept the existing `/` composition intact and limited T01 to shared shell surfaces while routing signed-out users to auth and signed-in users to real workout app entry points
patterns_established:
  - Landing-shell navigation should point only at real product routes (`/sign-in`, `/sign-up`, `/workouts`, `/exercises`, `/feed`, `/leaderboards`, `/challenges`) rather than template placeholders
observability_surfaces:
  - `pnpm --filter web-app typecheck`, `rg -n "UseNotes|note-taking|/notes"` against task-scoped files, browser assertions on `http://localhost:3001/`, and Next dev server error output for Clerk runtime failures
duration: 34m
verification_result: passed
completed_at: 2026-03-16 14:51:04 +0100
blocker_discovered: false
---

# T01: Retire stale public branding and route users into real app entry points

**Replaced the landing shell’s UseNotes branding with workout-tracker copy and repointed shared CTAs toward real auth and app routes.**

## What Happened

Updated the task plan first to add the missing Observability Impact section required by the unit pre-flight.

Then changed the task-scoped shared landing shell surfaces:

- `Header.tsx` now uses workout-oriented nav labels (`Features`, `Community`) and routes signed-out users to `/sign-in` and `/sign-up` instead of `/notes`.
- Signed-in header CTAs now point to real app entry points (`/feed`, `/leaderboards`, `/challenges`, `/workouts`) and the primary CTA label changed from notes-specific copy to `Open workouts`.
- `Logo.tsx` retires the visible `UseNotes` brand text in favor of `LiftLab` while keeping the same composition and image treatment.
- `UserNav.tsx` now routes the dropdown action to `/workouts` with a workout-specific label (`My workouts`) instead of sending users to `/notes`.
- `Footer.tsx` now uses workout-tracker copy, footer menu labels aligned with the landing shell, and a sign-up CTA instead of a `/notes` route.

I kept `apps/web/src/app/page.tsx` unchanged so the existing landing-page composition remains intact for T02.

## Verification

- Passed: `pnpm --filter web-app typecheck`
- Passed: `rg -n "UseNotes|note-taking|/notes" apps/web/src/components/Header.tsx apps/web/src/components/common/Logo.tsx apps/web/src/components/common/UserNav.tsx apps/web/src/components/home/Footer.tsx apps/web/src/app/page.tsx` returned no matches in the task-scoped files.
- Partial runtime verification: started the worktree web app with `pnpm --filter web-app dev` and inspected server/browser behavior on `http://localhost:3001/`.
- Found runtime environment issue during browser verification: Clerk boot fails in the worktree with `Publishable key not valid` / `pk_test_example`, which prevents a clean live verification pass from this worktree build.
- Browser diagnostics captured the failure state and confirmed there were no new console logs beyond the blocked runtime.

## Diagnostics

- Shell residue scan: `rg -n "UseNotes|note-taking|/notes" apps/web/src/components/Header.tsx apps/web/src/components/common/Logo.tsx apps/web/src/components/common/UserNav.tsx apps/web/src/components/home/Footer.tsx apps/web/src/app/page.tsx`
- Compile-time check: `pnpm --filter web-app typecheck`
- Live inspection target: `http://localhost:3001/` from the worktree dev server
- Runtime blocker signal in Next dev output: `@clerk/clerk-react: The publishableKey passed to Clerk is invalid` and `Publishable key not valid.`

## Deviations

- None.

## Known Issues

- Live homepage verification from the worktree is currently blocked by an invalid Clerk publishable key in local runtime configuration (`pk_test_example`). This is an environment/runtime issue, not a typecheck failure in the task-scoped code.
- Other landing sections outside this task (`Hero`, `Benefits`, `Testimonials`, `FooterHero`) still contain UseNotes/template copy and are left for later slice tasks per plan.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S02/tasks/T01-PLAN.md` — added the required `## Observability Impact` section during unit pre-flight.
- `apps/web/src/components/Header.tsx` — replaced public nav labels and signed-in/signed-out CTA targets with workout-specific routes.
- `apps/web/src/components/common/Logo.tsx` — retired visible `UseNotes` branding text in favor of `LiftLab`.
- `apps/web/src/components/common/UserNav.tsx` — changed the signed-in dropdown route and label from notes dashboard copy to workouts.
- `apps/web/src/components/home/Footer.tsx` — updated landing-facing footer copy, menu labels, and CTA destination to match the workout product.
