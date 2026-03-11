# S03: Integration Hardening & Verification — UAT

**Milestone:** M005
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + deferred live-runtime)
- Why this mode is sufficient: The primary deliverables are structural — a lib extraction, hook wiring, verification script, and UI button. TypeScript compilation proves type-level correctness across 3 packages. The verification script (15 checks) proves integration logic structurally. Live runtime verification requires Convex CLI auth which is currently blocked. Two-browser manual UAT is deferred to when the backend is live.

## Preconditions

- TypeScript compiles 0 errors on backend and web packages
- All 3 M05 verification scripts (S01, S02, S03) compile without errors
- `finishWorkoutCore` exists and is exported from `convex/lib/finishWorkoutCore.ts`
- For live tests: Convex backend deployed and accessible via `CONVEX_URL`
- For browser tests: Web app running at localhost with authenticated Clerk session

## Smoke Test

Run `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json && pnpm -C apps/web exec tsc --noEmit` — both exit 0. Then verify `grep -c 'SS-' packages/backend/scripts/verify-s03-m05.ts` returns ≥15.

## Test Cases

### 1. finishWorkoutCore extraction

1. Open `packages/backend/convex/lib/finishWorkoutCore.ts`
2. Verify it exports `finishWorkoutCore(db, userId, workoutId)`
3. Verify it contains 4 hook calls: feed item creation, leaderboard update, challenge progress, badge evaluation
4. Open `packages/backend/convex/workouts.ts` — verify `finishWorkout` calls `finishWorkoutCore`
5. **Expected:** `finishWorkoutCore` is the single source of truth; `workouts.ts` no longer directly imports leaderboard/challenge/badge libs

### 2. endSession workout completion

1. Open `packages/backend/convex/sessions.ts`, find `endSession` mutation
2. Verify it queries workouts by `by_sessionId` after marking participants
3. Verify it skips already-completed workouts
4. Verify it calls `finishWorkoutCore` per in-progress workout with try/catch
5. **Expected:** Each participant's workout is completed with all 4 hooks triggered; individual hook failures don't block other participants

### 3. checkSessionTimeouts workout completion

1. Open `packages/backend/convex/sessions.ts`, find `checkSessionTimeouts` internal mutation
2. Verify it includes the same `finishWorkoutCore` sweep in the auto-complete branch
3. **Expected:** Auto-completed sessions also finish participant workouts through the full hook pipeline

### 4. Verification script completeness

1. Open `packages/backend/scripts/verify-s03-m05.ts`
2. Count unique SS- check IDs
3. Verify SS-28 tests idempotent endSession (failure path / diagnostic signal)
4. Verify checks cover: workout completion, feed items, leaderboard, badges, left participant, idempotency, auto-timeout, S01 regression, S02 regression, summary, empty workout, workout list, FK integrity
5. **Expected:** 15 checks (SS-23 through SS-37) with at least one failure-path check

### 5. "Start Group Session" button

1. Open `/workouts` page in web browser (authenticated)
2. Verify "Start Group Session" button is visible in the page header
3. Inspect element — verify `data-start-group-session` attribute is present
4. Click the button
5. **Expected:** Button shows "Creating..." loading state, then navigates to `/workouts/session/[id]`

### 6. Regression — prior verification scripts

1. Run `npx tsx --no-warnings packages/backend/scripts/verify-s01-m05.ts --help`
2. Run `npx tsx --no-warnings packages/backend/scripts/verify-s02-m05.ts --help`
3. **Expected:** Both scripts load without compile errors (exit with "CONVEX_URL not found" which confirms they compiled)

## Edge Cases

### endSession idempotency

1. Call `endSession` on an already-completed session
2. **Expected:** Returns early without error; no duplicate feed items or hook re-runs

### finishWorkoutCore on already-completed workout

1. Call `finishWorkoutCore` on a workout with `status: "completed"`
2. **Expected:** Returns existing `{ completedAt, durationSeconds }` without re-running hooks

### Participant with no exercises

1. End a session where one participant joined but logged no sets
2. **Expected:** That participant's workout is still marked completed (empty workout is valid); no hook errors

### Hook failure isolation

1. If badge evaluation throws for participant A
2. **Expected:** Participant B's workout completion is not affected; error logged with participant A's userId

## Failure Signals

- TypeScript compilation errors in backend or web packages
- Missing `finishWorkoutCore` export or incorrect signature
- `endSession` not calling `finishWorkoutCore` (grep for it in sessions.ts)
- `checkSessionTimeouts` not calling `finishWorkoutCore` in auto-complete branch
- Fewer than 15 SS- check IDs in verify-s03-m05.ts
- Missing `data-start-group-session` attribute on workouts page
- Prior verification scripts (S01, S02) failing to compile (regression)
- `sessions.ts` function export count ≠ 15

## Requirements Proved By This UAT

- R021 (Collaborative Live Workouts) — This UAT proves that group session workout completion triggers the same 4-hook pipeline as solo workouts (feed, leaderboard, challenge, badge), that endSession and checkSessionTimeouts both finish participant workouts, that the integration is idempotent and resilient to per-participant failures, and that a UI entry point exists for creating group sessions. The comprehensive verification script (15 checks) covers the full session→workout→hooks integration lifecycle structurally.

## Not Proven By This UAT

- Live runtime execution of the 15 verification checks (blocked on Convex CLI auth)
- Two-browser end-to-end proof (create → join → log sets → timer → presence idle → end → summary)
- Actual realtime data delivery between participants (requires live Convex subscriptions)
- Mobile consumption of session APIs (S04 scope)
- Feed items actually appearing in the activity feed UI after group session completion
- Leaderboard entries being queryable and visible after group session completion
- Badge notifications appearing for users after group session completion

## Notes for Tester

- The "Start Group Session" button requires authentication — you'll be redirected to Clerk sign-in if not logged in
- All verification checks are structural (compile-time proof). Live execution requires `CONVEX_URL` environment variable pointing to a deployed Convex backend
- The 38 TS2307 errors in native are pre-existing and unrelated to S03 changes — they're `convex/react` module resolution issues
- When testing the two-browser end-to-end flow (future), use two different Clerk accounts or two browser profiles
- The `data-start-group-session` attribute enables automated browser testing: `document.querySelector('[data-start-group-session]')`
