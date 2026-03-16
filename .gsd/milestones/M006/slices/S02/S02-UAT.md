# S02: Landing Page Redesign — UAT

**Milestone:** M006
**Written:** 2026-03-16

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: the slice changed visible marketing UI and CTA routing, so source/typecheck checks are necessary but not enough; however, the live runtime path is currently blocked before render by shared Clerk middleware, so this UAT combines truthful artifact checks with a targeted runtime blocker check.

## Preconditions

- Run from the M006 worktree.
- Web dependencies are installed.
- `pnpm --filter web-app typecheck` passes.
- Use the worktree-local web server for truth, not any pre-existing shared repo server.
- If `localhost:3001` is already occupied, confirm it is serving the active worktree before using it.

## Smoke Test

Run `pnpm --filter web-app typecheck`, then scan the landing-owned files for `UseNotes|note-taking|Note-Taking|/notes`. The slice basically holds if typecheck passes and the residue scan is clean.

## Test Cases

### 1. Source-level residue removal

1. Run:
   `rg -n "UseNotes|note-taking|Note-Taking|/notes" apps/web/src/components/home apps/web/src/components/Header.tsx apps/web/src/components/common/Logo.tsx apps/web/src/components/common/UserNav.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css`
2. Inspect the command output.
3. **Expected:** no matches are returned from the landing-owned files.

### 2. Web package compile contract

1. Run: `pnpm --filter web-app typecheck`
2. Wait for TypeScript to finish.
3. **Expected:** command exits successfully with no type errors.

### 3. Worktree-local runtime target is truthful

1. Start the active worktree server on port 3001.
2. Open `http://localhost:3001/`.
3. Inspect the page source if the visible page is blank or the browser shows no landing content.
4. **Expected:** one of two truthful outcomes occurs:
   - best case: the redesigned landing page renders from the worktree; or
   - current known blocker case: page source shows Next `/_error` with Clerk `Publishable key not valid.` before render.

### 4. Landing page render proof after Clerk fix

1. Supply a valid local Clerk publishable key for the worktree server.
2. Restart the worktree-local web server.
3. Open `http://localhost:3001/`.
4. Confirm the page visibly contains:
   - workout-product hero
   - feature highlight section
   - results/social-proof section
   - final CTA section
5. Check the visible navigation and CTA links.
6. **Expected:** no visible UseNotes branding remains, visible CTAs point to auth or real app routes, and the landing page reads as a premium workout tracker showcase.

## Edge Cases

### Shared server is misleading

1. Open `http://localhost:3000/` if another dev server is already running there.
2. Compare the content against the current worktree source and, if needed, inspect whether it still shows stale UseNotes content.
3. **Expected:** if `:3000` is serving another checkout, do not use it as proof for S02; switch to the worktree-local server on `:3001`.

### Middleware failure before render

1. Open `http://localhost:3001/`.
2. If the body appears blank, inspect the full page source.
3. **Expected:** `__NEXT_DATA__` reveals the real blocker. In the current known state, it shows `statusCode: 500` and Clerk `Publishable key not valid.`.

## Failure Signals

- Any `UseNotes`, `note-taking`, or `/notes` match in the landing-owned files.
- `pnpm --filter web-app typecheck` fails.
- The visible landing page renders stale template copy or routes users to `/notes`.
- Browser page source resolves to Next `/_error` because middleware/auth fails before render.
- Client console/runtime errors appear after the landing page successfully renders.

## Requirements Proved By This UAT

- R030 — proves source-level removal of stale branding/routes, and defines the exact runtime checks needed to validate the live landing page once Clerk config is fixed.
- R029 — proves the remaining web-runtime blocker is auth quality, not missing package wiring or missing type safety.

## Not Proven By This UAT

- R030 is not yet fully validated in live runtime because middleware currently blocks the landing page before render.
- R031 app-shell and authenticated-page design refresh work are intentionally outside this slice.

## Notes for Tester

Use the worktree-local server, not whichever server happens to be on `:3000`. If the page is blank, that is not automatically a homepage bug — inspect page source first. The current known failure is a Clerk publishable-key issue that aborts before any landing UI mounts.
