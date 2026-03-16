# S05: Backend Testing & Bug Fixes

**Goal:** Execute the 119 pending M003–M005 backend verification checks against the live Convex deployment, fix the earliest truthful failures at the narrowest production/helper seam, and leave validated evidence for R015–R021.
**Demo:** From the worktree root, the backend readiness probes pass and all nine M003–M005 verification runners exit 0 with their expected totals (42/42 for M003, 40/40 for M004, 41/41 for M005), with requirement evidence updated to reflect the live pass.

## Must-Haves

- Prove the live backend contract is still healthy before blaming product code by re-running the S01 readiness probes against the canonical backend env boundary.
- Execute all nine M003–M005 verification runners in dependency order and capture truthful pass/fail evidence for each script.
- Fix any failing checks at the narrowest real seam — production domain module first, `convex/testing.ts` only when helper drift is the cause, and `finishWorkoutCore.ts` when cross-domain completion hooks are implicated.
- Leave the repo with a repeatable slice-close verification path plus updated GSD artifacts for R015–R021 and R032.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
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
- Re-run the earliest failing verification script from the sweep and confirm the same first failing check ID recurs before attempting any fix.
- Capture the failing script’s stable check ID and sanitized error text before and after the fix to prove the inspection surface remains useful for future localization.

## Observability / Diagnostics

- Runtime signals: readiness probes classify env/connectivity/auth-or-deployment/seed-data failures; each verification script prints stable check IDs and per-check pass/fail output; failing integration paths surface through domain errors or cleanup drift in `testing.ts`.
- Inspection surfaces: `packages/backend/scripts/verify-env-contract.ts`, `packages/backend/scripts/verify-seed-data.ts`, the 9 `verify-s*-m0*.ts` runners, `packages/backend/convex/testing.ts`, and domain modules under `packages/backend/convex/` plus `convex/lib/finishWorkoutCore.ts`.
- Failure visibility: first failing script and check ID are the triage handle; cross-run leakage is inspectable through `testCleanup` coverage and rerunning the earliest failing script before downstream suites.
- Redaction constraints: never print secret values from package env files; diagnostics may report only file paths, variable names, failure phases, user-safe check IDs, and sanitized error text.

## Integration Closure

- Upstream surfaces consumed: `packages/backend/.env.local`, S01 verifier scripts, M003–M005 verification runners, `packages/backend/convex/testing.ts`, `packages/backend/convex/{social,sharing,leaderboards,challenges,badges,sessions}.ts`, and `packages/backend/convex/lib/finishWorkoutCore.ts`.
- New wiring introduced in this slice: optional backend package script aliases or a thin wrapper only if needed to make the verification sweep repeatable after the first truthful pass; no new test framework.
- What remains before the milestone is truly usable end-to-end: S06 still needs Expo/iOS runtime proof; if backend verification exposes unrelated web runtime blockers, those remain outside this slice unless they directly block the backend sweep.

## Tasks

- [x] **T01: Establish the live backend verification baseline** `est:45m`
  - Why: S05 only has truthful signal if the configured Convex deployment, env contract, and existing verification runners are exercised from a known-good starting point before any fixes begin.
  - Files: `packages/backend/scripts/verify-env-contract.ts`, `packages/backend/scripts/verify-seed-data.ts`, `packages/backend/scripts/verify-s01-m03.ts`, `packages/backend/scripts/verify-s02-m03.ts`, `packages/backend/scripts/verify-s03-m03.ts`, `packages/backend/scripts/verify-s01-m04.ts`, `packages/backend/scripts/verify-s02-m04.ts`, `packages/backend/scripts/verify-s03-m04.ts`, `packages/backend/scripts/verify-s01-m05.ts`, `packages/backend/scripts/verify-s02-m05.ts`, `packages/backend/scripts/verify-s03-m05.ts`, `packages/backend/package.json`
  - Do: run the two readiness probes first, then execute the nine M003–M005 verification runners individually in dependency order from earliest domain to latest integration; capture each script’s current result, first failing check ID if any, and whether the command surface needs lightweight package script aliases for repeatability; only add aliases/wrapper wiring if it materially improves reruns without hiding per-script truth.
  - Verify: the T01 deliverable is a recorded baseline showing readiness-probe results plus pass/fail status for all 9 runners, with any added command alias exercised successfully against at least one script.
  - Done when: the repo has a truthful baseline for every pending backend verification script and the next task can start from the earliest failing script/check instead of rediscovering the sweep order.
- [x] **T02: Repair failing backend verification seams and rerun the staged sweep** `est:2.5h`
  - Why: R015–R021 only move toward validated when failing checks are fixed at their real seam and rerun in dependency order so later failures are not chased before earlier causes are resolved.
  - Files: `packages/backend/convex/testing.ts`, `packages/backend/convex/lib/finishWorkoutCore.ts`, `packages/backend/convex/social.ts`, `packages/backend/convex/sharing.ts`, `packages/backend/convex/leaderboards.ts`, `packages/backend/convex/challenges.ts`, `packages/backend/convex/badges.ts`, `packages/backend/convex/sessions.ts`, `packages/backend/scripts/verify-s01-m03.ts`, `packages/backend/scripts/verify-s02-m03.ts`, `packages/backend/scripts/verify-s03-m03.ts`, `packages/backend/scripts/verify-s01-m04.ts`, `packages/backend/scripts/verify-s02-m04.ts`, `packages/backend/scripts/verify-s03-m04.ts`, `packages/backend/scripts/verify-s01-m05.ts`, `packages/backend/scripts/verify-s02-m05.ts`, `packages/backend/scripts/verify-s03-m05.ts`
  - Do: use the earliest failing script/check from T01 as the triage entrypoint; inspect the matching domain module and mirrored helper in `testing.ts`, fix the narrowest root cause, rerun that script immediately, then rerun every downstream script that depends on the same seam; if failures implicate workout-completion hooks shared across domains or sessions, fix `finishWorkoutCore.ts` and rerun the affected M004/M005 suites before moving on; keep the nine-script staged order intact rather than inventing a new aggregate-first workflow.
  - Verify: after each fix, rerun the earliest failing script first; at task close, all nine M003–M005 verification scripts exit 0 with expected totals and `pnpm turbo run typecheck --filter=@packages/backend` passes.
  - Done when: no M003–M005 backend verification check is failing, reruns are clean without cleanup leakage, and backend typecheck still passes.
- [x] **T03: Record validation evidence and close the slice contract** `est:45m`
  - Why: The slice is not done when scripts pass locally; it is done when requirement status, slice evidence, and state artifacts make the live validation legible to the next agent.
  - Files: `.gsd/REQUIREMENTS.md`, `.gsd/STATE.md`, `.gsd/KNOWLEDGE.md`, `.gsd/DECISIONS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md`, `.gsd/milestones/M006/slices/S05/S05-UAT.md`
  - Do: update requirement statuses/evidence for R015–R021 and R032 based on the actual sweep results, record any new durable verification or cleanup knowledge discovered during execution, append only truly structural decisions, mark S05 complete in the roadmap if the contract passed, and write the slice summary/UAT artifacts so S06 can rely on the backend as validated input.
  - Verify: artifact diffs truthfully reflect the executed commands and observed results; the final slice-close command list in the summary matches the commands that were actually used to prove the pass.
  - Done when: GSD artifacts show S05 as planned-for-execution with a complete close-out target, and an executor can finish the slice then update statuses without re-deriving what counts as proof.

## Files Likely Touched

- `packages/backend/package.json`
- `packages/backend/convex/testing.ts`
- `packages/backend/convex/lib/finishWorkoutCore.ts`
- `packages/backend/convex/social.ts`
- `packages/backend/convex/sharing.ts`
- `packages/backend/convex/leaderboards.ts`
- `packages/backend/convex/challenges.ts`
- `packages/backend/convex/badges.ts`
- `packages/backend/convex/sessions.ts`
- `.gsd/REQUIREMENTS.md`
- `.gsd/STATE.md`
- `.gsd/KNOWLEDGE.md`
- `.gsd/DECISIONS.md`
- `.gsd/milestones/M006/M006-ROADMAP.md`
- `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md`
- `.gsd/milestones/M006/slices/S05/S05-UAT.md`
