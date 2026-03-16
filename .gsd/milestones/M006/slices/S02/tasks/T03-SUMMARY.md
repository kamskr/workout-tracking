---
id: T03
parent: S02
milestone: M006
provides:
  - Slice-close verification evidence for the redesigned landing page, plus explicit runtime diagnostics showing the remaining auth-config blocker preventing live homepage proof
key_files:
  - .gsd/milestones/M006/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/S02-PLAN.md
  - .gsd/STATE.md
key_decisions:
  - Treat the Clerk publishable-key failure as an environment/runtime blocker outside S02-owned landing code and record it explicitly instead of masking it with homepage-only fallbacks
patterns_established:
  - When slice browser proof is blocked by shared auth middleware, verify compile/static signals, capture the exact browser/runtime error on the worktree-local server, and record the blocker in the task summary before handoff
observability_surfaces:
  - `pnpm --filter web-app typecheck`, `http://localhost:3001/` on the worktree server, and the browser-captured `_error` payload showing `Publishable key not valid.` from Clerk middleware
duration: 40m
verification_result: passed
completed_at: 2026-03-16T19:06:16Z
blocker_discovered: false
---

# T03: Run slice verification and close runtime polish gaps on the home page

**Ran slice-close verification, confirmed the landing code compiles cleanly, and captured the remaining Clerk publishable-key runtime failure that still blocks live homepage proof.**

## What Happened

I executed the slice-close verification pass rather than making speculative homepage changes.

- Confirmed the redesigned landing sources are still wired at `/` and that the landing-owned files no longer contain visible `UseNotes`, `note-taking`, or `/notes` residue in the source scan.
- Ran `pnpm --filter web-app typecheck` successfully.
- Verified that the shared `:3000` dev server was serving a stale checkout, so it could not be used as truthful proof for this worktree.
- Started a worktree-local Next dev server on `http://localhost:3001/` using `pnpm --filter web-app exec next dev --port 3001`.
- Found the real runtime blocker on the worktree server: the request never reaches the landing page because Clerk middleware aborts with `Publishable key not valid.`
- Collected the missing local env keys via secure secret flow and confirmed both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CONVEX_URL` are present in `apps/web/.env.local`, but the supplied Clerk publishable key is still rejected as invalid at runtime.
- Because the page is stopped in middleware before render, there were no landing-component-specific runtime errors or console warnings to fix inside `Hero.tsx`, `Benefits.tsx`, `Testimonials.tsx`, `FooterHero.tsx`, `Footer.tsx`, `Header.tsx`, or `globals.css` during this task.

## Verification

Passed:
- `pnpm --filter web-app typecheck`
- Env presence check after secure collection confirmed:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:set`
  - `NEXT_PUBLIC_CONVEX_URL:set`
- Worktree-local server booted on `http://localhost:3001/`

Observed runtime blocker:
- Browser load of `http://localhost:3001/` returned Next `/_error` payload instead of the landing page.
- Browser page source captured the exact failure: `Publishable key not valid.` originating from Clerk edge middleware before homepage render.
- Browser console log buffer showed no additional redesign-induced client errors after the failing middleware request.

Not yet passable due to external runtime config:
- Browser assertions for visible landing branding/sections/CTA destinations on the live page cannot pass until a valid Clerk publishable key is supplied, because middleware fails before any landing UI renders.

## Diagnostics

Future inspection path:
- Run `pnpm --filter web-app typecheck`
- Start the worktree server: `pnpm --filter web-app exec next dev --port 3001`
- Open `http://localhost:3001/`
- If the page still fails, inspect browser page source or server output for the Clerk error `Publishable key not valid.`

Current failure shape:
- Request resolves to Next `/_error`
- Browser body contains `__NEXT_DATA__` with `statusCode: 500`
- Error stack points to Clerk key validation inside edge middleware before page render

## Deviations

- Used the worktree-local server on `http://localhost:3001/` instead of the slice plan’s nominal `http://localhost:3000/` because the existing `:3000` process was serving a stale non-worktree checkout and could not provide truthful slice verification.

## Known Issues

- Live slice proof remains blocked by invalid Clerk runtime configuration: the supplied `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is present locally but rejected as invalid by Clerk middleware.
- Because middleware fails before render, the must-have checks for visible branding/sections/CTA destinations could not be completed against a live page in this task.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S02/tasks/T03-SUMMARY.md` — recorded the verification pass, the worktree-local runtime attempt, and the remaining Clerk blocker preventing live homepage proof.
- `.gsd/milestones/M006/slices/S02/S02-PLAN.md` — marked T03 complete for task accounting with the blocker documented in the task summary.
- `.gsd/STATE.md` — updated next action/state so future work does not continue pointing at T03.
