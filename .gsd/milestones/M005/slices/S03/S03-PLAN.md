# S03: Integration Hardening & Verification

**Goal:** Each participant's group session workout flows through the same finishWorkout hook pipeline as solo workouts (feed, leaderboard, challenge, badge), a comprehensive verification script proves 15+ checks across the full session lifecycle, and the workouts page has a "Start Group Session" entry point.

**Demo:** After the host ends a group session, each participant's workout is completed with feed items created, leaderboard entries updated, challenge progress incremented, and badges evaluated — verified by `verify-s03-m05.ts` with 15+ checks all compiling cleanly. The `/workouts` page shows a "Start Group Session" button that creates a session and navigates to the live session page.

## Must-Haves

- `finishWorkoutCore` lib function extracted from `finishWorkout` containing the 4 non-fatal hooks (feed item, leaderboard, challenge, badge)
- `finishWorkout` in `workouts.ts` refactored to call `finishWorkoutCore` (identical behavior, no regression)
- `endSession` in `sessions.ts` calls `finishWorkoutCore` for each participant's inProgress workout (skip already-completed)
- `checkSessionTimeouts` in `sessions.ts` also finishes participant workouts when auto-completing sessions
- `testFinishWorkoutWithAllHooks` test helper in `testing.ts` that runs all 4 hooks (unlike existing `testFinishWorkout` which only runs feed item)
- `verify-s03-m05.ts` verification script with 15+ checks (SS-23 through SS-37)
- "Start Group Session" button on `/workouts` page that creates a session and navigates to `/workouts/session/[id]`
- TypeScript compiles 0 errors on backend and web, 0 new errors on native

## Proof Level

- This slice proves: integration
- Real runtime required: no (contract proof via ConvexHttpClient verification script; live runtime blocked on Convex CLI auth)
- Human/UAT required: yes (two-browser end-to-end proof deferred to when Convex backend is live — the verification script and TypeScript compilation prove correctness structurally)

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors
- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `pnpm -C apps/native exec tsc --noEmit` — 0 new errors (38 pre-existing TS2307)
- `packages/backend/scripts/verify-s03-m05.ts` compiles and defines 15+ checks (SS-23 through SS-37)
- `verify-s01-m05.ts` and `verify-s02-m05.ts` still compile (regression)
- `finishWorkoutCore` is importable from `convex/lib/finishWorkoutCore.ts`
- `endSession` includes per-participant `finishWorkoutCore` calls with idempotent skip for already-completed workouts
- `checkSessionTimeouts` includes per-participant workout finishing on auto-complete
- "Start Group Session" button visible on `/workouts` page with `data-start-group-session` attribute
- At least one verification check validates a diagnostic/failure-path signal (SS-28: endSession idempotent — no duplicate feed items)

## Observability / Diagnostics

- Runtime signals: `[Session] endSession` structured log extended with "finished N participant workouts" count. Per-participant hook failures logged with `[Session] endSession: hook error for participant {userId}: {error}`. `[Session] checkSessionTimeouts` log extended with workout finish count.
- Inspection surfaces: `getSessionSummary` query returns `durationSeconds` per participant (proves workout was completed). `testGetFeed` query returns feed items for session participants (proves feed hook ran). `testGetUserBadges` returns badges (proves badge hook ran).
- Failure visibility: Per-participant try/catch in `endSession` and `checkSessionTimeouts` — individual participant hook failures don't block other participants. Error logged with participant userId for correlation.
- Redaction constraints: None — no secrets or PII in session/workout hook logs.

## Integration Closure

- Upstream surfaces consumed: `sessions.ts` (15 functions from S01+S02), `workouts.ts` (`finishWorkout` with 4 inlined hooks), `lib/leaderboardCompute.ts`, `lib/challengeCompute.ts`, `lib/badgeEvaluation.ts`, `testing.ts` (92 exports including 11 session helpers)
- New wiring introduced in this slice: `finishWorkoutCore` lib function connecting `endSession`/`checkSessionTimeouts` → feed + leaderboard + challenge + badge hooks. "Start Group Session" button connecting `/workouts` page → `createSession` mutation → `/workouts/session/[id]` navigation.
- What remains before the milestone is truly usable end-to-end: S04 mobile port (GroupSessionScreen, SessionLobbyScreen, JoinSessionScreen). Live Convex backend for runtime verification of all 104+ pending checks. Two-browser manual UAT.

## Tasks

- [x] **T01: Extract finishWorkoutCore and wire into endSession + checkSessionTimeouts** `est:25m`
  - Why: The primary integration gap — `endSession` currently marks participants as "left" but never completes their workouts or triggers hooks. This task creates the shared lib function and wires it into both session completion paths.
  - Files: `packages/backend/convex/lib/finishWorkoutCore.ts`, `packages/backend/convex/workouts.ts`, `packages/backend/convex/sessions.ts`
  - Do: Extract the 4 non-fatal hooks from `finishWorkout` into `finishWorkoutCore(db, userId, workoutId)`. Refactor `finishWorkout` to: auth check → call `finishWorkoutCore`. Modify `endSession` to iterate participants, find their workouts via `by_sessionId`, skip already-completed, call `finishWorkoutCore` for each. Modify `checkSessionTimeouts` similarly. Per-participant try/catch for resilience.
  - Verify: `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors. `finishWorkoutCore` exported from lib. `endSession` and `checkSessionTimeouts` import and call it.
  - Done when: Backend compiles, `finishWorkoutCore` is the single source of truth for workout completion hooks, both session completion paths call it.

- [x] **T02: Add testFinishWorkoutWithAllHooks helper and comprehensive verification script** `est:25m`
  - Why: The existing `testFinishWorkout` only creates feed items — a new helper running all 4 hooks is needed, plus the comprehensive verification script proving the full integration.
  - Files: `packages/backend/convex/testing.ts`, `packages/backend/convex/_generated/api.d.ts`, `packages/backend/scripts/verify-s03-m05.ts`
  - Do: Add `testFinishWorkoutWithAllHooks` to testing.ts that calls `finishWorkoutCore`. Add `testGetFeedItemsForWorkout` query helper. Write `verify-s03-m05.ts` with 15 checks (SS-23 through SS-37) covering: endSession workout completion, feed items per participant, leaderboard entries, badge evaluation, left-before-end participant handling, idempotent endSession, timeout auto-complete with workout finishing, session create+join+heartbeat+set log regression, timer+end regression, summary accuracy, empty workout handling, listWorkouts inclusion, sessionId FK integrity.
  - Verify: `npx tsx --no-warnings packages/backend/scripts/verify-s03-m05.ts --help` or tsc compilation of the script. All 3 prior verification scripts still compile.
  - Done when: `verify-s03-m05.ts` compiles with 15 checks defined, `testFinishWorkoutWithAllHooks` exported from testing.ts, `_generated/api.d.ts` updated.

- [x] **T03: Add "Start Group Session" button on workouts page** `est:10m`
  - Why: No UI entry point exists to create a group session — users must know the URL pattern. This is the only missing UI piece per the roadmap.
  - Files: `apps/web/src/app/workouts/page.tsx`
  - Do: Add a "Start Group Session" button that calls `api.sessions.createSession` mutation and navigates to `/workouts/session/[sessionId]` on success. Use `useMutation` + `useRouter`. Add `data-start-group-session` attribute. Loading state during creation. Error handling with try/catch.
  - Verify: `pnpm -C apps/web exec tsc --noEmit` — 0 errors. Button has `data-start-group-session` attribute in JSX.
  - Done when: Web compiles, button is in the workouts page markup, mutation + navigation wired.

- [x] **T04: TypeScript compilation gate and regression verification** `est:5m`
  - Why: Final structural verification that all changes compile across 3 packages and nothing regressed.
  - Files: none (read-only verification)
  - Do: Run tsc on all 3 packages. Verify all 3 verification scripts (S01, S02, S03) compile. Spot-check file exports and function counts.
  - Verify: `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json && pnpm -C apps/web exec tsc --noEmit` — 0 errors. `pnpm -C apps/native exec tsc --noEmit` — 0 new errors.
  - Done when: 0 errors on backend and web, 0 new errors on native. All 3 M05 verification scripts compile. `sessions.ts` still has 15 function exports. `finishWorkoutCore` is importable.

## Files Likely Touched

- `packages/backend/convex/lib/finishWorkoutCore.ts` — New: extracted workout completion hooks
- `packages/backend/convex/workouts.ts` — Refactored: `finishWorkout` delegates to `finishWorkoutCore`
- `packages/backend/convex/sessions.ts` — Modified: `endSession` and `checkSessionTimeouts` call `finishWorkoutCore`
- `packages/backend/convex/testing.ts` — Extended: `testFinishWorkoutWithAllHooks`, `testGetFeedItemsForWorkout`
- `packages/backend/convex/_generated/api.d.ts` — Updated: new testing exports
- `packages/backend/scripts/verify-s03-m05.ts` — New: 15-check comprehensive verification script
- `apps/web/src/app/workouts/page.tsx` — Modified: "Start Group Session" button
