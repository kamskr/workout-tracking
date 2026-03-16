---
id: M006
provides:
  - A stabilized local dev-stack contract, premium web redesign foundations across public and authenticated surfaces, and live backend verification proof for M003–M005, with the remaining gap isolated to machine-level iOS simulator tooling and pre-render auth/runtime blockers.
key_decisions:
  - Preserve truth over completeness claims: backend/runtime proof is green where it actually ran, while web live render proof and iOS simulator proof remain explicitly blocked rather than inferred.
  - Treat `packages/backend/.env.local` as the canonical local runtime boundary and reuse the blocker-aware verification seams added in S02–S06 instead of inventing new close-out checks.
patterns_established:
  - Milestone-close verification should classify blocker phases before treating missing selectors or absent simulator UI as product regressions.
  - Cross-slice stabilization work is only considered closed when code changes, verifier scripts, and durable diagnostics all line up in `.gsd` state and requirement records.
observability_surfaces:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts` through `scripts/verify-s03-m05.ts`
  - `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - `pnpm --filter web-app typecheck`
  - `cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 pnpm exec playwright test tests/app-shell.spec.ts tests/app-pages-refresh.spec.ts --config playwright.config.ts`
  - `xcode-select -p`
  - `xcrun simctl list devices`
  - `pnpm --filter native-app exec expo start --ios`
requirement_outcomes:
  - id: R015
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s01-m03.ts` passed 12/12 after readiness probes succeeded.
  - id: R016
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s02-m03.ts` passed 15/15 against the configured Convex deployment.
  - id: R017
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s03-m03.ts` passed 15/15 on the live backend.
  - id: R018
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s01-m04.ts` passed 12/12 and backend typecheck remained green.
  - id: R019
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s02-m04.ts` passed 16/16 during baseline and rerun sweeps.
  - id: R020
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s03-m04.ts` passed 12/12 on the live backend.
  - id: R021
    from_status: active
    to_status: validated
    proof: M006/S05 live backend verification — `verify-s01/02/03-m05.ts` passed 12/10/19, proving 41/41 total session checks.
  - id: R032
    from_status: active
    to_status: validated
    proof: M006/S05 readiness probes, failure-fixture proof, nine live verification runners, and backend typecheck all passed.
duration: ~1 milestone cycle across S01-S06
verification_result: failed
completed_at: 2026-03-16T14:51:04+01:00
---

# M006: Stabilization, Testing & Design Refresh

**Stabilized the local backend/web contract, replaced the leftover marketing shell, refreshed the authenticated web product into a coherent Apple Fitness+-style system, and closed all live backend verification green — but did not achieve final live web render proof or iOS simulator runtime proof because those remain blocked by auth/runtime and Xcode-tooling boundaries.**

## What Happened

M006 turned a feature-complete but only partially trusted product into a much more diagnosable and largely verified system.

S01 established a real local runtime contract instead of template assumptions. The backend now owns the canonical local env boundary, verification scripts prove cross-package alignment, seed-data readiness is classified by failure phase, native Convex imports compile under pnpm strictness, and the web app boots locally with seeded backend data reachable.

S02 then replaced the leftover UseNotes landing surface with workout-specific branding, CTAs, and premium landing sections. That redesign is real in source and typechecked cleanly, but the slice also exposed the truthful blocker for live proof: the worktree-local request can die in Clerk middleware before homepage render, so runtime verification had to be recorded as blocked rather than faked.

S03 and S04 systematized the authenticated web redesign. Protected routes now share a dedicated App Router shell seam, warm token namespace, reusable shell primitives, and route-level observability hooks. The redesign widened from representative pages to the rest of the internal product surface — templates, profiles, workout flows, exercise detail, challenges, and session collaboration. These slices also left behind blocker-aware Playwright proof that distinguishes auth/env/build failures from real selector regressions.

S05 closed the biggest truth gap in the product: all pending M003–M005 backend verification was run live against Convex. The readiness probes passed, the env verifier’s failure fixture remained inspectable, and all nine verification runners closed green for totals of M003 42/42, M004 40/40, and M005 41/41. That moved R015–R021 and R032 to validated with actual evidence instead of structural confidence.

S06 then isolated the remaining native gap precisely. Native code compiles, Expo loads env and reaches Metro, and startup diagnostics are now visible instead of globally suppressed. But the machine still points developer tools at CommandLineTools, `simctl` is unavailable, and Expo iOS launch stops before simulator startup. So the remaining blocker is explicitly machine-level Xcode tooling, not a proven app-code defect.

Taken together, the milestone substantially improved shippability on backend integrity, product presentation, and observability. It did not fully satisfy the original milestone definition of done because two final runtime proofs remain missing: live browser render validation for the redesigned web surfaces, and iOS simulator proof for the native app.

## Cross-Slice Verification

Success criteria and milestone definition-of-done verification:

- **Convex backend, Next.js web app, and Expo mobile app all boot cleanly in local dev**
  - **Partially met / not fully met.**
  - Backend readiness passed in S01 via `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` with `Seed query returned 144 exercises`.
  - Web boot passed in S01 via `pnpm --filter web-app dev` and browser navigation to `http://localhost:3000/`.
  - Native compile plus Metro startup passed in S06 via `pnpm --filter native-app typecheck` and `pnpm --filter native-app exec expo start --ios`, but simulator launch failed before UI runtime because `xcode-select -p` returned `/Library/Developer/CommandLineTools` and `xcrun simctl list devices` failed.

- **Landing page at `/` shows a polished workout tracker showcase with feature highlights and CTA — no trace of UseNotes**
  - **Partially met / not fully live-validated.**
  - S02 passed `pnpm --filter web-app typecheck` and a residue scan for `UseNotes|note-taking|Note-Taking|/notes` across landing-owned files returned no matches.
  - Live render validation remained blocked on the worktree-local server because `/` resolved to Next `/_error` with Clerk `Publishable key not valid.` before render.

- **All authenticated app pages share a cohesive Apple Fitness+ design language with consistent navigation**
  - **Implemented and structurally verified, but not fully live-validated.**
  - S03 introduced the authenticated shell seam, design tokens, shared primitives, representative route adoption, and a local Playwright harness.
  - S04 widened the redesign across the remaining authenticated routes and feature components.
  - Verification passed through `pnpm --filter web-app typecheck` plus blocker-aware Playwright runs targeting `http://127.0.0.1:3001`; however those runs skipped after blocker classification rather than asserting rendered UI because the app still failed before render.

- **All 119 M003–M005 verification checks pass against a live Convex backend**
  - **Met.**
  - S05 executed all nine backend runners live: M003 `42/42`, M004 `40/40`, M005 `41/41`.

- **R015–R021 are validated with live verification evidence**
  - **Met.**
  - S05 moved R015–R021 to validated with command-level proof in `.gsd/REQUIREMENTS.md`.

- **iOS Simulator runs the mobile app with all 7 tabs rendering and navigation working**
  - **Not met.**
  - S06 confirmed the intended 7-tab contract in `apps/native/src/navigation/MainTabs.tsx`, but no simulator UI proof was possible because `simctl` was unavailable and Expo stopped before simulator launch.

- **TypeScript compiles 0 new errors across all 3 packages**
  - **Met.**
  - S01 passed `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`.
  - S05 also passed `pnpm turbo run typecheck --filter=@packages/backend` after the live backend sweep.
  - S06 passed `pnpm --filter native-app typecheck`.

Definition-of-done checks:

- **All slices marked complete** — met. S01–S06 are all `[x]` in the roadmap and all slice summaries/UAT files exist.
- **Cross-slice integration points present** — met where provable:
  - S01 runtime/env contract was consumed by S02–S06.
  - S03 shell/design system was consumed by S04.
  - S05 consumed the S01 backend readiness seam and validated backend requirements.
  - S06 consumed S01/S05 as input and localized the remaining native boundary.
- **Milestone DoD fully satisfied** — **not met overall** because these items remain unproven or blocked:
  - landing page live render proof
  - authenticated app live render proof
  - Expo iOS simulator boot with 7-tab/runtime walkthrough
  - core mobile flow runtime testing
  - “all bugs found during testing are fixed” is not claimable while the current runtime blockers remain open

## Requirement Changes

- R015: active → validated — `verify-s01-m03.ts` passed 12/12 live in S05.
- R016: active → validated — `verify-s02-m03.ts` passed 15/15 live in S05.
- R017: active → validated — `verify-s03-m03.ts` passed 15/15 live in S05.
- R018: active → validated — `verify-s01-m04.ts` passed 12/12 live in S05.
- R019: active → validated — `verify-s02-m04.ts` passed 16/16 live in S05.
- R020: active → validated — `verify-s03-m04.ts` passed 12/12 live in S05.
- R021: active → validated — `verify-s01/02/03-m05.ts` passed 12/10/19, proving 41/41 live session checks in S05.
- R032: active → validated — readiness probes, failure-fixture proof, all nine live runners, and backend typecheck passed in S05.
- R029: remained active — S01 proved backend/web boot and S06 proved native compile + Metro, but simulator runtime is still blocked at the machine Xcode boundary.
- R030: remained active — landing redesign shipped and residue scans/typecheck passed, but live homepage render proof is still blocked by Clerk middleware before render.
- R031: remained active — authenticated shell/page refresh shipped and blocker-aware proof harness exists, but current runtime checks still stop before rendered-page assertions.
- R033: remained active — seven-tab contract is present in code and Expo reaches Metro, but no iOS simulator runtime proof exists while `simctl` is unavailable.

## Forward Intelligence

### What the next milestone should know
- Most of M006’s remaining risk is no longer feature depth. It is runtime truth at two boundaries: Clerk/web pre-render auth failure on the worktree server, and macOS Xcode/simulator readiness for native proof.
- The backend is already green. If a future milestone touches M003–M005 behavior, start from the S05 runner surface rather than re-investigating feature code blind.
- The web redesign now has stable composition seams (`/(app)`, `AppShell`, `AppCard`, `PageHeader`, `StatCard`, `AppBadge`, `SessionPageShell`) and stable proof hooks. Reuse those; don’t fork page-local shells.

### What's fragile
- Local auth/runtime configuration for the web app — it can fail in middleware before any page renders, which makes browser selector failures misleading.
- Native runtime closure on this machine — until full Xcode tooling is active, any claim about tabs, flows, or screen bugs is speculative because the simulator never launches.

### Authoritative diagnostics
- `packages/backend/scripts/verify-env-contract.ts` and `packages/backend/scripts/verify-seed-data.ts` — fastest trustworthy signal for env drift vs backend reachability.
- `apps/web/tests/helpers/authBlockers.ts` plus returned HTML on port 3001 — authoritative for distinguishing real UI regressions from auth/env/build blockers before hydration.
- `xcode-select -p` and `xcrun simctl list devices` — authoritative first check for whether native debugging is even happening at the app layer.

### What assumptions changed
- The original milestone assumption was that design refresh plus runtime verification would end in a fully demoable web/native product. What actually happened is that backend verification closed cleanly, but final web and native runtime proof remained blocked by environment/tooling boundaries.
- The initial S06 assumption was that mobile debugging would mostly involve app code. What actually happened is that the first stop point stayed outside the app — CommandLineTools instead of full Xcode, with no working `simctl`.

## Files Created/Modified

- `.gsd/milestones/M006/M006-SUMMARY.md` — final milestone close-out record with verified outcomes, remaining blockers, and requirement transitions.
- `.gsd/PROJECT.md` — updated project state to reflect M006 close status, what actually shipped, and what remains blocked.
- `.gsd/STATE.md` — updated quick-glance milestone state, blockers, and next action after M006 close.
