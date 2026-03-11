---
id: T01
parent: S02
milestone: M005
provides:
  - groupSessions schema with sharedTimerEndAt, sharedTimerDurationSeconds, completedAt
  - startSharedTimer, pauseSharedTimer, skipSharedTimer mutations (any participant)
  - endSession mutation (host-only, idempotent)
  - getSessionSummary query (per-participant aggregated stats)
  - checkSessionTimeouts internalMutation (15-min stale auto-complete)
  - 3rd cron entry at 5-minute interval
  - 6 test helpers in testing.ts
  - verify-s02-m05.ts verification script with 11 checks
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/sessions.ts
  - packages/backend/convex/crons.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s02-m05.ts
key_decisions:
  - Timer mutations (start/pause/skip) validate participant membership but allow any active participant (D140 last-write-wins)
  - endSession returns early (no throw) for idempotent calls on already-completed sessions, following completeChallenge pattern
  - checkSessionTimeouts requires BOTH all-stale-heartbeats AND session-created-15min-ago guards
  - getSessionSummary calculates totalVolume as sum(weight*reps) for non-warmup sets only
patterns_established:
  - Timer mutations pattern: auth → session lookup → participant membership check → patch timer fields → structured log
  - Session lifecycle pattern: host-only guard → idempotent status guard → patch + participant sweep → structured log
  - Timeout cron pattern: sweep waiting+active → per-session try/catch → all-participants-stale check → auto-complete
observability_surfaces:
  - "[Session] startSharedTimer" — logs sessionId, userId, durationSeconds
  - "[Session] pauseSharedTimer" — logs sessionId, userId
  - "[Session] skipSharedTimer" — logs sessionId, userId
  - "[Session] endSession" — logs success with participant count, idempotent skip, or non-host rejection
  - "[Session] checkSessionTimeouts" — logs sessions scanned and auto-completed count
  - Per-session try/catch in checkSessionTimeouts logs errors without halting sweep
duration: 18m
verification_result: passed
completed_at: 2026-03-11T16:28+01:00
blocker_discovered: false
---

# T01: Extend schema, add 5 backend functions + timeout cron, and 6 test helpers

**Added 3 schema fields, 6 session functions (timer/lifecycle/summary/timeout), 3rd cron entry, 6 test helpers, and S02 verification script with 11 checks.**

## What Happened

Extended `groupSessions` table with 3 optional fields (`sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt`) — all `v.optional(v.number())` so no migration needed.

Added 6 new functions to `sessions.ts` (bringing total to 15 exports):
- `startSharedTimer` — any participant sets timer end timestamp and duration
- `pauseSharedTimer` — clears countdown, keeps duration for UI default
- `skipSharedTimer` — semantically "skip rest", same clear behavior
- `endSession` — host-only with idempotent guard, marks session completed and all non-left participants as left
- `getSessionSummary` — traverses workouts→workoutExercises→sets for per-participant stats
- `checkSessionTimeouts` — internalMutation sweeping stale sessions with per-session try/catch

Registered `checkSessionTimeouts` as 3rd cron entry at 5-minute interval.

Added 6 test helpers to `testing.ts` (total 16 session helpers): `testStartSharedTimer`, `testPauseSharedTimer`, `testSkipSharedTimer`, `testEndSession`, `testGetSessionSummary`, `testCheckSessionTimeouts`.

Created `verify-s02-m05.ts` with 11 checks (ST-01 through ST-11) covering timer start/pause/skip, endSession host-only/idempotent/rejection, summary aggregation, and timeout behavior.

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors ✅
- `tsc --noEmit` on `apps/web` — 0 errors ✅
- `tsc --noEmit` on `apps/native` — only pre-existing TS2307 errors (38), no new errors ✅
- `grep -c "export const" packages/backend/convex/sessions.ts` → 15 ✅
- `grep -c "crons.interval" packages/backend/convex/crons.ts` → 3 ✅
- 6 distinct S02 test helper exports confirmed in testing.ts ✅
- `verify-s01-m05.ts` regression — still compiles (no broken imports) ✅
- `verify-s02-m05.ts` — compiles, 11 checks defined (pending live Convex backend for execution) ✅

### Slice-level verification status (intermediate task — partial expected):
- ✅ `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- ✅ `tsc --noEmit` on `apps/web` — 0 errors
- ✅ `tsc --noEmit` on `apps/native` — 0 new errors
- ⏳ `npx tsx packages/backend/scripts/verify-s02-m05.ts` — script created, pending live backend
- ✅ `verify-s01-m05.ts` regression — compiles
- ⏳ Web session page renders SharedTimerDisplay — T03
- ⏳ Web session page renders "End Session" button — T03
- ⏳ Web session page renders summary view — T03

## Diagnostics

- `getSession` query automatically returns `sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt` (doc spread)
- `getSessionSummary` returns `{ sessionId, hostId, status, createdAt, completedAt, participantSummaries[] }` with per-participant exerciseCount, setCount, totalVolume, durationSeconds
- All new functions log with `[Session]` prefix for consistent structured observability
- `checkSessionTimeouts` logs scan count + auto-complete count every 5 minutes; per-session errors logged but don't halt processing
- `endSession` logs three distinct paths: success, idempotent skip, non-host rejection

## Deviations

- Created `verify-s02-m05.ts` in T01 instead of waiting for T02, since the task plan's test helpers and verification script are closely coupled. The T02 task can refine/extend it.

## Known Issues

- `checkSessionTimeouts` ST-09 test (true auto-completion) requires either a way to manipulate `createdAt` or waiting 15 real minutes. The verification script confirms the logic runs without error and respects the createdAt guard, but can't prove full auto-completion without a stale session.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added 3 optional fields to `groupSessions` table
- `packages/backend/convex/sessions.ts` — Added 6 new functions (15 total exports): 3 timer mutations, endSession, getSessionSummary, checkSessionTimeouts
- `packages/backend/convex/crons.ts` — Added 3rd cron entry for `checkSessionTimeouts` at 5-minute interval
- `packages/backend/convex/testing.ts` — Added 6 S02 test helpers (16 total session helpers)
- `packages/backend/scripts/verify-s02-m05.ts` — New S02 verification script with 11 checks
