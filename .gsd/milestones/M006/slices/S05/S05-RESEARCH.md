# S05 — Research

**Date:** 2026-03-16

## Summary

S05 owns R032 directly and is the live-validation gate for R015–R021. The codebase already has the full verification surface in place: 9 backend verification scripts under `packages/backend/scripts/verify-s01-m03.ts` through `verify-s03-m05.ts`, plus the helper/cleanup seam in `packages/backend/convex/testing.ts`. This slice is not about inventing new tests; it is about executing the existing 119 checks truthfully against the configured Convex deployment, triaging failures, and fixing production/test-helper drift where the failing script points.

The natural risk is not missing coverage but divergence. Each script is a standalone runner with its own setup, cleanup, and assumptions. There is no shared harness. If a check fails, the likely causes are: a production bug in one domain module (`social.ts`, `sharing.ts`, `leaderboards.ts`, `challenges.ts`, `badges.ts`, `sessions.ts`), a mismatch between production code and `testing.ts`, or cleanup leakage between checks/users. `finishWorkoutCore` is the main integration seam for M004/M005 behavior; any bug affecting feed items, leaderboard entries, challenge progress, or badges after workout/session completion should be fixed there or in the hook libraries it calls.

## Recommendation

Run S05 as a staged backend verification sweep, not as a broad app-wide debugging pass.

Start with the existing S01 readiness probes (`verify-env-contract.ts`, `verify-seed-data.ts`) to prove the backend URL and seeded data are still good. Then execute the 9 M003–M005 verification scripts individually, in order: M003 first (`verify-s01-m03.ts`, `verify-s02-m03.ts`, `verify-s03-m03.ts`), then M004, then M005. Keep them separate so the first failing script identifies the broken domain cleanly. Fix failures at the narrowest truthful seam: domain module first, `testing.ts` only when the helper no longer mirrors production, `testCleanup` when failures show leaked state across runs.

Do not start by building a new aggregate runner. The current scripts already print stable check IDs and failure details, and their independence is useful for triage. If the slice wants a convenience wrapper later, that should come after the first truthful pass, once the failing surfaces are understood.

## Implementation Landscape

### Key Files

- `packages/backend/scripts/verify-s01-m03.ts` — 12 checks for R015 user profiles. Establishes the baseline verification pattern: resolve `CONVEX_URL`, cleanup on entry/exit, deterministic test users, `check()` result reporting.
- `packages/backend/scripts/verify-s02-m03.ts` — 15 checks for R016 social/feed/reactions/blocking. Exercises `social.ts` plus `testFinishWorkout` feed-item behavior.
- `packages/backend/scripts/verify-s03-m03.ts` — 15 checks for R017 sharing/privacy. Exercises `sharing.ts`, privacy cascade, clone-as-template, analytics/profile visibility differences.
- `packages/backend/scripts/verify-s01-m04.ts` — 12 checks for R018 leaderboards. Exercises leaderboard computation, opt-in filtering, rank lookups, delete cascades.
- `packages/backend/scripts/verify-s02-m04.ts` — 16 checks for R019 challenges. Exercises lifecycle transitions, progress computation, standings ordering, cancellation, listing.
- `packages/backend/scripts/verify-s03-m04.ts` — 12 checks for R020 badges. Exercises badge evaluation thresholds, dedupe, metadata enrichment, cleanup.
- `packages/backend/scripts/verify-s01-m05.ts` — 12 checks for R021 sessions S01 coverage: invite codes, join/idempotency, heartbeat, set feed, participant cap.
- `packages/backend/scripts/verify-s02-m05.ts` — 10 checks for R021 sessions S02 coverage: shared timer, host-only end, timeout behavior, summary.
- `packages/backend/scripts/verify-s03-m05.ts` — 15 checks for R021 sessions S03 integration: session completion through `finishWorkoutCore`, feed/leaderboard/badge hooks, idempotency, timeout path.
- `packages/backend/convex/testing.ts` — giant test seam. Mirrors production behaviors for all milestone domains and owns `testCleanup`. Any failing script will usually map back here or to the corresponding production module.
- `packages/backend/convex/lib/finishWorkoutCore.ts` — single source of truth for workout completion hooks: feed item, leaderboard update, challenge update, badge evaluation. Primary seam for M004/M005 integration bugs.
- `packages/backend/convex/social.ts` — R016 production logic: follows, feed query, reactions, blocks, reports.
- `packages/backend/convex/sharing.ts` — R017 production logic: share token creation, public shared-workout read, clone-as-template, privacy cascade.
- `packages/backend/convex/leaderboards.ts` — R018 public leaderboard queries and opt-in mutation; failures here will often pair with `lib/leaderboardCompute.ts` or cleanup issues.
- `packages/backend/convex/challenges.ts` — R019 lifecycle and public challenge API; progress bugs may instead live in `lib/challengeCompute.ts`.
- `packages/backend/convex/badges.ts` — R020 public badge query; award logic itself lives in `lib/badgeEvaluation.ts` and is triggered by `finishWorkoutCore`.
- `packages/backend/convex/sessions.ts` — R021 production session lifecycle, heartbeat, timer, summary, timeout behavior.
- `packages/backend/scripts/verify-env-contract.ts` — upstream S01 env-drift check. Should run before the 119-check sweep.
- `packages/backend/scripts/verify-seed-data.ts` — upstream backend reachability/seed-data probe. Fastest truthful signal before blaming product code.
- `packages/backend/package.json` — currently exposes only `verify:env-contract` and `verify:seed-data`; no script aliases exist yet for the 9 verification runners.

### Build Order

1. **Prove environment and backend readiness first.** Run `verify:env-contract` and `verify-seed-data` before any domain script. This retires setup drift early and keeps S05 failures attributable to product/test code instead of env mismatch.
2. **Run M003 scripts first.** R015–R017 are foundational and also seed social/profile/privacy state that later features conceptually build on. Fixing profile/feed/share drift first reduces noise in later checks.
3. **Run M004 scripts second.** Leaderboards, challenges, and badges depend on completed-workout data and shared test-helper patterns already exercised by M003.
4. **Run M005 scripts last.** Sessions are the highest integration surface and rely on `finishWorkoutCore`; by the time these run, feed/leaderboard/badge/challenge hooks should already be trustworthy.
5. **If failures appear, fix the narrowest seam and rerun only the failing script first.** After the script passes, rerun the downstream script set that depends on the same seam. Example: a `finishWorkoutCore` fix should be followed by rerunning M004 badge/challenge/leaderboard checks and all M005 checks.
6. **Only after a truthful first pass, decide whether to add a wrapper script.** It is optional convenience, not the primary slice deliverable.

### Verification Approach

Run from the worktree root:

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

Expected truth surface:

- each script exits 0 and prints all checks as pass
- cleanup runs without non-fatal drift warnings
- M003 totals 42/42, M004 totals 40/40, M005 totals 37/37
- no helper/production mismatch remains in `testing.ts`

If a script fails, use its failing check ID as the triage handle and inspect the matching domain module plus relevant `testing.ts` helper. For session integration failures, inspect `finishWorkoutCore.ts` first.

## Constraints

- `packages/backend/.env.local` is the canonical local backend env boundary from S01; all S05 verification assumes that file is already the truthful source of `CONVEX_URL`.
- The 9 verification scripts are standalone TSX runners, not package.json scripts and not a shared test framework. Planning should treat them as separate execution units.
- `testCleanup` in `packages/backend/convex/testing.ts` is the single state-reset seam across profiles, social data, leaderboard entries, challenges, sessions, user badges, workouts, templates, and preferences. Cross-script flakiness will often come from cleanup omissions.
- `finishWorkoutCore.ts` is intentionally idempotent and is the shared completion path for direct workout completion, `endSession`, and `checkSessionTimeouts`; changing completion behavior anywhere else risks divergence.

## Common Pitfalls

- **Fixing only production or only test helpers** — Most scripts depend on `testing.ts` mirroring production closely. When a bug surfaces, check both the domain module and its mirrored helper before declaring the issue resolved.
- **Chasing later-script failures before rerunning earlier ones** — A broken feed/leaderboard/badge hook can cascade into M005 session failures. Re-run the earliest failing script after each fix to keep attribution clean.
- **Assuming empty feed/query results mean auth failure** — `verify-seed-data.ts` already classifies env/connectivity/auth-or-deployment separately. If that passes, empty data in a verification script is product or helper logic, not environment drift.
- **Ignoring cleanup leakage** — Several scripts use overlapping deterministic user IDs. If a check unexpectedly sees extra rows, inspect `testCleanup` coverage first.

## Open Risks

- The current backend package has no unified verification runner or package.json aliases for the 9 scripts, so slice execution may add repetitive command surface unless a wrapper is introduced.
- `testing.ts` is large and hand-maintained. Any production changes made after the original milestone slices may have drifted from their mirrored test helpers in ways not yet exercised.
- Session verification depends on multi-hook completion side effects; a single non-fatal hook failure inside `finishWorkoutCore` can leave the primary completion path looking healthy while secondary assertions fail later.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex / backend verification | none found in installed skills | none found |
