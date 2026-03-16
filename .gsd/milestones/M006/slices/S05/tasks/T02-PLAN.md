---
estimated_steps: 6
estimated_files: 11
---

# T02: Repair failing backend verification seams and rerun the staged sweep

**Slice:** S05 — Backend Testing & Bug Fixes
**Milestone:** M006

## Description

Take the earliest failing backend verification script/check from T01, find the real root cause, fix it at the narrowest truthful seam, and rerun in dependency order until the entire M003–M005 sweep passes. The bias here is toward production/domain fixes first, mirrored helper fixes in `testing.ts` only when there is clear drift, and `finishWorkoutCore.ts` when failures span feed/leaderboard/challenge/badge/session completion behavior.

## Steps

1. Reproduce the earliest failing script from T01 immediately and use the failing check ID as the triage handle; read the relevant verification script, matching production module, and any mirrored helper in `packages/backend/convex/testing.ts` before changing code.
2. Form the narrowest root-cause hypothesis: production domain bug (`social.ts`, `sharing.ts`, `leaderboards.ts`, `challenges.ts`, `badges.ts`, `sessions.ts`), helper drift in `testing.ts`, cleanup leakage in `testCleanup`, or cross-domain completion drift in `convex/lib/finishWorkoutCore.ts`.
3. Implement the smallest real fix at the confirmed seam. Do not patch around failures in later scripts before the earliest failing script passes.
4. Rerun the same failing script immediately. If it now passes, rerun any downstream scripts that depend on the same seam before moving on to a later failure. Treat `finishWorkoutCore.ts` changes as affecting M004 badge/challenge/leaderboard checks plus all M005 session integration scripts.
5. Repeat the reproduce → inspect → fix → rerun loop until all nine M003–M005 verification runners pass cleanly without cleanup leakage.
6. Finish with `pnpm turbo run typecheck --filter=@packages/backend` and record exactly which seams were fixed, which scripts were rerun, and any remaining watch-outs for later slices.

## Must-Haves

- [ ] Every fix is rooted in an observed failing check and applied at the narrowest truthful seam rather than papering over downstream symptoms.
- [ ] The earliest failing script is always rerun before later suites, and downstream reruns follow seam dependency rather than convenience.
- [ ] All nine pending M003–M005 verification scripts pass by task close, and backend typecheck remains green.

## Verification

- Re-run the earliest failing script after each change until it passes.
- Re-run all affected downstream scripts after seam-specific fixes:
  - M003 scripts if the failure is in profiles/social/sharing foundations.
  - M004 and M005 scripts after `finishWorkoutCore.ts`, leaderboard, challenge, badge, cleanup, or shared helper fixes.
- Final sweep:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m05.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m05.ts`
  - `pnpm turbo run typecheck --filter=@packages/backend`

## Observability Impact

- Signals added/changed: only durable diagnostics that help future failure localization; no noisy one-off logging should remain unless it adds lasting value.
- How a future agent inspects this: rerun the relevant verification script by check family, inspect `testing.ts` cleanup/helper behavior, and inspect `finishWorkoutCore.ts` for any shared completion-hook changes.
- Failure state exposed: the final summary must name the fixed seam for each formerly failing script and note any cross-script dependency pattern discovered during reruns.

## Inputs

- `.gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md` — baseline identifying the earliest failing script/check and any readiness caveats.
- `packages/backend/convex/testing.ts` — mirrored helper and cleanup seam shared across the verification surface.
- `packages/backend/convex/lib/finishWorkoutCore.ts` — shared workout-completion hook seam for feed, leaderboard, challenge, and badge behavior.
- `packages/backend/convex/social.ts`, `sharing.ts`, `leaderboards.ts`, `challenges.ts`, `badges.ts`, `sessions.ts` — production domain modules implicated by the verification families.
- `packages/backend/scripts/verify-s01-m03.ts` through `packages/backend/scripts/verify-s03-m05.ts` — authoritative failing-check specifications.
- S05 research guidance — do not start by inventing a new aggregate runner; keep the staged sweep intact.

## Expected Output

- `packages/backend/convex/testing.ts` and/or the relevant production backend modules — root-cause fixes that make the failing checks pass.
- `.gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md` — concise record of failing checks, confirmed root causes, files changed, rerun order, and final green verification evidence.
