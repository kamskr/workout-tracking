# S02: Group Challenges — Backend + Web UI

**Goal:** Users create time-limited group challenges, friends join, logging sets updates live standings, and scheduled functions complete challenges at deadline with the correct winner — all backed by `challenges` and `challengeParticipants` tables, a new `crons.ts`, and a `/challenges` web page.

**Demo:** A user creates a "Most Pull-ups This Week" challenge on web, 3 friends join via the challenges page, each logs pull-up sets during the active period, the standings update showing who's winning, and the `completeChallenge` internal mutation fires to determine the correct winner — verifiable via a 16-check verification script across 4 test users.

## Must-Haves

- `challenges` table with status state machine (pending → active → completed → cancelled), `challengeParticipants` table with pre-computed `currentValue` and indexed standings
- `challengeType` and `challengeStatus` validator exports from schema
- `challenges.ts` with auth-gated functions: `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`, `getChallengeStandings`, `listChallenges`, `getChallenge`
- `completeChallenge` and `activateChallenge` as `internalMutation` functions — idempotent, handling status transitions
- `checkDeadlines` internal query + `crons.ts` with periodic challenge lifecycle management (every 15 min)
- `lib/challengeCompute.ts` with `updateChallengeProgress(db, userId, workoutId)` — incremental delta computation per challenge type
- Non-fatal challenge progress hook in `finishWorkout` (third try/catch block after leaderboard)
- `ctx.scheduler.runAt(endAt)` for precise challenge completion scheduling on creation
- `ctx.scheduler.runAt(startAt)` for challenge activation scheduling (when startAt is future)
- Test helpers in `testing.ts` (~10 helpers) and `testCleanup` extended with challenge data deletion
- `verify-s02-m04.ts` with 16 named checks across 4 test users proving full lifecycle
- `/challenges` web page with challenge list (filterable by status), create form, detail view with standings, join/leave/cancel buttons
- "Challenges" nav link in Header (desktop + mobile)
- `/challenges(.*)` added to middleware protected routes
- `data-challenge-*` attributes on all key UI containers
- TypeScript compiles with 0 new errors across backend and web packages

## Proof Level

- This slice proves: integration (real mutation chains: create challenge → join → finishWorkout → standings update → completeChallenge → winner determination)
- Real runtime required: yes (verification script requires running Convex backend, `crons.ts` requires `npx convex dev`)
- Human/UAT required: yes (visual verification of /challenges page layout and interaction flows)

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `cd apps/web && npx tsc --noEmit` — 0 new errors (pre-existing clsx TS2307 only)
- `npx tsx packages/backend/scripts/verify-s02-m04.ts` — 16/16 checks pass (requires live Convex backend)
- Structural verification: `crons.ts` exists and exports default `cronJobs()` result
- Structural verification: `finishWorkout` has 3 non-fatal try/catch blocks (feed + leaderboard + challenge)
- Structural verification: `/challenges` page has `data-challenge-page`, `data-challenge-list`, `data-challenge-detail`, `data-challenge-standings`, `data-challenge-create`, `data-challenge-join` attributes
- Structural verification: Header has "Challenges" link for both desktop and mobile
- Structural verification: Middleware protects `/challenges(.*)`

## Observability / Diagnostics

- Runtime signals: `[Challenge] Error updating progress for workout ${workoutId}: ${err}` — structured console.error in finishWorkout non-fatal hook (matches `[Feed Item]` and `[Leaderboard]` prefixes). `[Challenge] completeChallenge(${challengeId}): already ${status}, skipping` for idempotent no-ops. `[Challenge] activateChallenge(${challengeId}): activated` for state transitions.
- Inspection surfaces: `getChallengeStandings` returns `{ participants, challenge }` — challenge status and participant count enable lifecycle diagnostics. `listChallenges` filterable by status for state-machine verification. `testGetRawChallenge` and `testGetRawParticipants` bypass auth for verification scripts.
- Failure visibility: Challenge completion idempotency — `completeChallenge` logs and returns early on non-active status. `finishWorkout` non-fatal hook — challenge progress failure visible only in Convex dashboard logs, never blocks workout completion. Stale `currentValue` on participant entries after workout deletion is a documented known limitation.
- Redaction constraints: None — no secrets or PII in challenge data.

## Integration Closure

- Upstream surfaces consumed:
  - `packages/backend/convex/workouts.ts` — `finishWorkout` hook insertion point (after leaderboard hook)
  - `packages/backend/convex/schema.ts` — existing validator export pattern, profiles table
  - `packages/backend/convex/testing.ts` — `testCleanup`, `testFinishWorkout`, test helper patterns
  - `packages/backend/convex/lib/leaderboardCompute.ts` — working set filter pattern, upsert-on-improvement pattern
  - `packages/backend/convex/_generated/api.d.ts` — manual module registration (challenges, crons, lib/challengeCompute)
  - `apps/web/src/app/leaderboards/page.tsx` — pill picker UI pattern, data attribute pattern
  - `apps/web/src/components/Header.tsx` — nav link insertion points
  - `apps/web/src/middleware.ts` — protected route matcher list
- New wiring introduced in this slice:
  - `crons.ts` — first Convex cron job in the project (periodic challenge lifecycle check)
  - `ctx.scheduler.runAt` — first use of timestamp-based scheduling (challenge completion + activation)
  - Third non-fatal hook in `finishWorkout` for challenge progress
  - `/challenges` route in web app with dynamic detail view
- What remains before the milestone is truly usable end-to-end:
  - S03: Badge evaluation on workout completion + badge display on profiles
  - S04: Mobile port of all competitive features (leaderboards, challenges, badges)
  - Live execution of all verification scripts (S01+S02+S03) for requirement validation
  - Human UAT of competitive feature flows on web and mobile

## Tasks

- [x] **T01: Schema + challenge compute + crons.ts + finishWorkout hook** `est:25m`
  - Why: Establishes the data layer (2 new tables, validators), the computation engine (incremental delta per challenge type), the scheduling infrastructure (crons.ts + ctx.scheduler.runAt), and the workout completion hook — the complete backend foundation that T02's queries/mutations and T03's UI depend on.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/lib/challengeCompute.ts`, `packages/backend/convex/challenges.ts` (internal mutations only), `packages/backend/convex/crons.ts`, `packages/backend/convex/workouts.ts`, `packages/backend/convex/_generated/api.d.ts`
  - Do: Add `challenges` and `challengeParticipants` tables to schema with validators. Create `challengeCompute.ts` with `updateChallengeProgress` (4-type switch: workoutCount increment, totalReps sum, totalVolume sum, maxWeight compare-and-update). Create `completeChallenge`, `activateChallenge`, `checkDeadlines` as internalMutations in `challenges.ts`. Create `crons.ts` exporting `cronJobs()` with 15-minute interval calling `checkDeadlines`. Wire `updateChallengeProgress` into `finishWorkout` as third non-fatal hook. Update `api.d.ts` with new modules.
  - Verify: `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors. `grep "[Challenge]" packages/backend/convex/workouts.ts` shows the hook. `crons.ts` exists and exports default.
  - Done when: Schema has both tables with correct indexes, challengeCompute.ts handles all 4 types, crons.ts exists, finishWorkout has 3 non-fatal hooks, TypeScript compiles clean.

- [x] **T02: Public queries/mutations + test helpers + verification script** `est:25m`
  - Why: Exposes the challenge API to clients (create, join, leave, cancel, list, get, standings) and proves the entire lifecycle with a 16-check verification script — this is the contract proof that the backend works correctly before the UI is built.
  - Files: `packages/backend/convex/challenges.ts` (add public functions), `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s02-m04.ts`
  - Do: Add 7 auth-gated public functions to `challenges.ts` (createChallenge with scheduler.runAt, joinChallenge with cap/duplicate checks, leaveChallenge, cancelChallenge creator-only, getChallengeStandings with profile enrichment, listChallenges with status filter, getChallenge). Add ~10 test helpers to `testing.ts` (testCreateChallenge, testJoinChallenge, testLeaveChallenge, testCancelChallenge, testGetChallengeStandings, testListChallenges, testGetChallenge, testCompleteChallenge, testActivateChallenge, testGetRawChallenge). Extend `testCleanup` with challenge data deletion. Write `verify-s02-m04.ts` with 16 named checks (CH-01 through CH-16) across 4 test users.
  - Verify: `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors. `verify-s02-m04.ts` has 16 checks. Test helpers exist. `testCleanup` includes challenge data.
  - Done when: All 7 public functions + ~10 test helpers + 16-check verification script compile cleanly. Lifecycle is fully exercisable via test helpers.

- [x] **T03: Web UI — /challenges page, navigation, middleware** `est:25m`
  - Why: Delivers the user-facing experience — challenge browsing, creation, detail with standings, and join/leave/cancel actions. Completes the R019 web surface.
  - Files: `apps/web/src/app/challenges/page.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/middleware.ts`
  - Do: Create `/challenges` page (~450-500 lines) with: StatusPicker (Active/Completed/My Challenges pills), ChallengeList with cards (title, type badge, participant count, time remaining), CreateChallengeForm (modal with title, type picker, exercise selector for exercise-specific types, start/end date inputs), ChallengeDetail (standings table with rank/user/value, challenge info, join/leave/cancel buttons). Add `data-challenge-*` attributes on all key containers. Add "Challenges" link to Header (desktop + mobile) after "Leaderboards". Add `/challenges(.*)` to middleware protected routes.
  - Verify: `cd apps/web && npx tsc --noEmit` — 0 new errors. Grep for all 6 `data-challenge-*` attributes. Header has "Challenges" link. Middleware has `/challenges(.*)`.
  - Done when: `/challenges` page renders with full CRUD flow, all data attributes present, navigation and middleware wired, TypeScript compiles clean.

## Files Likely Touched

- `packages/backend/convex/schema.ts` — challenges + challengeParticipants tables, validator exports
- `packages/backend/convex/lib/challengeCompute.ts` — new: incremental challenge progress computation
- `packages/backend/convex/challenges.ts` — new: 7 public + 3 internal challenge functions
- `packages/backend/convex/crons.ts` — new: first cron job in the project
- `packages/backend/convex/workouts.ts` — third non-fatal hook in finishWorkout
- `packages/backend/convex/testing.ts` — ~10 test helpers + testCleanup extension
- `packages/backend/convex/_generated/api.d.ts` — manual module additions
- `packages/backend/scripts/verify-s02-m04.ts` — new: 16-check verification script
- `apps/web/src/app/challenges/page.tsx` — new: challenges page with full UI
- `apps/web/src/components/Header.tsx` — "Challenges" nav link
- `apps/web/src/middleware.ts` — `/challenges(.*)` protected route
