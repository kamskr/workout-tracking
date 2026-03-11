---
estimated_steps: 4
estimated_files: 3
---

# T02: Public queries/mutations + test helpers + verification script

**Slice:** S02 — Group Challenges — Backend + Web UI
**Milestone:** M004

## Description

Exposes the challenge system to clients through 7 auth-gated public functions (create, join, leave, cancel, list, get, standings). Adds ~10 test helpers to `testing.ts` for the verification script to exercise the full lifecycle without Clerk auth. Extends `testCleanup` with challenge data deletion. Writes `verify-s02-m04.ts` with 16 named checks across 4 test users proving: challenge CRUD, join/leave, standings computation, all 4 metric types, participant cap enforcement, status transitions, deadline completion with winner determination, idempotent completion, cancellation, and exercise-specific standings.

This task wires T01's internal infrastructure to client-facing API and proves it works end-to-end via the verification script.

## Steps

1. **Add 7 auth-gated public functions to `challenges.ts`:**
   - `createChallenge = mutation`: args `{ title, description?, type, exerciseId?, startAt, endAt }`. Validate: `endAt > Date.now()`, `startAt < endAt`, exercise-specific types require `exerciseId`. Insert challenge with `status: "pending"`, `creatorId: userId`, `createdAt: Date.now()`. Schedule completion: `const scheduledId = await ctx.scheduler.runAt(args.endAt, internal.challenges.completeChallenge, { challengeId })`. Patch challenge with `scheduledCompletionId`. If `startAt <= Date.now()`, set status to `"active"` directly; else schedule activation: `ctx.scheduler.runAt(args.startAt, internal.challenges.activateChallenge, { challengeId })`. Creator auto-joins (insert participant with `currentValue: 0`). Return `challengeId`.
   - `joinChallenge = mutation`: args `{ challengeId }`. Check challenge exists and status is "pending" or "active". Check no duplicate via `by_challengeId_userId` index. Check participant count < 100 (D115). Insert participant with `currentValue: 0`, `joinedAt: Date.now()`.
   - `leaveChallenge = mutation`: args `{ challengeId }`. Find participant via `by_challengeId_userId`. Must not be creator (`challenge.creatorId !== userId`). Delete participant doc.
   - `cancelChallenge = mutation`: args `{ challengeId }`. Only creator can cancel. Status must be "pending" or "active". Patch status to "cancelled". If `scheduledCompletionId` exists, cancel scheduled function via `ctx.scheduler.cancel(challenge.scheduledCompletionId)`.
   - `getChallengeStandings = query`: args `{ challengeId }`. Fetch challenge. Fetch participants via `by_challengeId_currentValue` index, order desc, take 100. Enrich each with profile info (displayName, username — handle missing profiles gracefully with userId fallback). Return `{ challenge, participants: [...] }`.
   - `listChallenges = query`: args `{ status?, myOnly? }`. If `status` provided, query with `by_status` index. If `myOnly`, query `challengeParticipants` by `by_userId`, collect challengeIds, then fetch challenges. Return up to 50 challenges with participant count (bounded sub-query). Order by `createdAt` desc.
   - `getChallenge = query`: args `{ challengeId }`. Fetch and return challenge doc with participant count.

2. **Add ~10 test helpers to `testing.ts`:**
   - Import `challengeType`, `challengeStatus` from schema
   - `testCreateChallenge`: accepts `testUserId`, `title`, `type`, `exerciseId?`, `startAt`, `endAt`. Mirrors `createChallenge` logic but uses testUserId directly. Skips `ctx.scheduler.runAt` (test helpers don't schedule — verification script will call `testCompleteChallenge` directly). Auto-joins creator. Returns challengeId.
   - `testJoinChallenge`: accepts `testUserId`, `challengeId`. Mirrors join logic. Returns participant _id.
   - `testLeaveChallenge`: accepts `testUserId`, `challengeId`. Finds and deletes participant.
   - `testCancelChallenge`: accepts `testUserId`, `challengeId`. Creator check + status transition.
   - `testGetChallengeStandings`: accepts `challengeId`. Returns participants ordered by currentValue desc with profile enrichment.
   - `testListChallenges`: accepts optional `status` filter. Returns challenges.
   - `testGetChallenge`: accepts `challengeId`. Returns challenge doc.
   - `testCompleteChallenge`: accepts `challengeId`. Mirrors `completeChallenge` internal mutation — idempotent status check, winner determination, status transition. This is how the verification script triggers completion without crons/schedulers.
   - `testActivateChallenge`: accepts `challengeId`. Mirrors `activateChallenge` — transitions pending → active.
   - `testGetRawParticipants`: accepts `challengeId`. Returns raw participant docs (no profile enrichment) for verification assertions.
   - Extend `testCleanup`: add deletion of `challengeParticipants` by userId (via `by_userId` index) and `challenges` by creatorId (via `by_creatorId` index).

3. **Write `verify-s02-m04.ts` with 16 named checks:**
   - Follow `verify-s01-m04.ts` structure: ConvexHttpClient, check() helper, cleanup-before-test pattern, 4 test user IDs (`test-ch-user-1` through `test-ch-user-4`)
   - Setup: cleanup all 4 users. Seed 1 exercise (pull-ups or similar via existing test helpers). Create profiles for users 1-3 (user 4 has no profile — tests graceful fallback).
   - **CH-01**: Challenge created with correct fields and "pending" status — create challenge with future startAt, verify status/type/title
   - **CH-02**: Challenge activates when startAt reached — call `testActivateChallenge`, verify status becomes "active"
   - **CH-03**: User can join a challenge — user 2 joins, verify participant count is 2 (creator + joiner)
   - **CH-04**: Duplicate join rejected — user 2 joins again, expect error
   - **CH-05**: Standings return participants ordered by currentValue descending — set up known values then verify order
   - **CH-06**: workoutCount metric increments correctly — create workoutCount challenge, user logs workout via `testFinishWorkout` → `testUpdateChallengeProgress`, verify currentValue incremented
   - **CH-07**: totalReps metric sums correctly for challenge exercise — create totalReps challenge for specific exercise, log sets with known reps, verify sum
   - **CH-08**: totalVolume metric computes correctly (Σ weight×reps) — similar setup with known weight×reps products
   - **CH-09**: maxWeight metric tracks highest single-set weight — log multiple sets, verify max tracked
   - **CH-10**: Challenge status transition: pending → active (proven via CH-02, this checks via getChallenge query)
   - **CH-11**: completeChallenge determines correct winner (highest currentValue) — complete a challenge with multiple participants with different values, verify winnerId
   - **CH-12**: completeChallenge is idempotent — call again, verify no error and challenge unchanged
   - **CH-13**: cancelChallenge transitions to cancelled (creator only) — creator cancels, verify status
   - **CH-14**: listChallenges filters by status correctly — verify active/completed/cancelled lists
   - **CH-15**: Challenge with no participants (besides creator with 0 value) completes correctly — completes with winnerId set to creator (highest, even if 0) or no winner
   - **CH-16**: leaveChallenge removes participant entry — user leaves, verify participant count decreases

4. **Update `api.d.ts` if T01's manual additions need extension:**
   - Ensure `challenges` module in fullApi covers both internal and public function types
   - Verify `testing` module still compiles with new test helper exports

## Must-Haves

- [ ] 7 auth-gated public functions in `challenges.ts` (createChallenge, joinChallenge, leaveChallenge, cancelChallenge, getChallengeStandings, listChallenges, getChallenge)
- [ ] `createChallenge` uses `ctx.scheduler.runAt(endAt)` for completion scheduling and `ctx.scheduler.runAt(startAt)` for activation if future
- [ ] `joinChallenge` enforces participant cap (100) and duplicate prevention
- [ ] `cancelChallenge` restricted to creator and cancels scheduled function
- [ ] ~10 test helpers in `testing.ts` following established testUserId pattern
- [ ] `testCleanup` extended with challenge + challengeParticipant deletion
- [ ] `verify-s02-m04.ts` with 16 named checks (CH-01 through CH-16) across 4 test users
- [ ] Verification script follows existing structure (ConvexHttpClient, check() helper, cleanup-before-test)
- [ ] A `testUpdateChallengeProgress` helper that wraps `updateChallengeProgress` for the verification script to call after `testFinishWorkout`
- [ ] TypeScript compiles with 0 errors across backend

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `grep "createChallenge\|joinChallenge\|leaveChallenge\|cancelChallenge\|getChallengeStandings\|listChallenges\|getChallenge" packages/backend/convex/challenges.ts` shows all 7 public functions
- `grep "testCreateChallenge\|testJoinChallenge\|testCompleteChallenge" packages/backend/convex/testing.ts` shows test helpers
- `grep "CH-01\|CH-16" packages/backend/scripts/verify-s02-m04.ts` shows first and last checks
- `grep "challengeParticipants\|challenges" packages/backend/convex/testing.ts | grep -i cleanup` shows cleanup extension

## Observability Impact

- Signals added/changed: Auth-gated functions throw descriptive errors: "Challenge not found", "Already joined", "Participant cap reached (100)", "Only the challenge creator can cancel", "Challenge must be pending or active to cancel". These surface as mutation errors in Convex dashboard and client-side error handlers.
- How a future agent inspects this: `testGetRawParticipants(challengeId)` bypasses auth for direct participant inspection. `testGetChallenge(challengeId)` returns raw challenge doc. `testListChallenges({ status })` enables state-machine verification. Verification script output shows pass/fail per check with detail.
- Failure state exposed: Participant cap error ("Participant cap reached (100)") is a clear signal. Duplicate join error. Creator-only cancel error. All are inspectable via mutation error responses.

## Inputs

- `packages/backend/convex/challenges.ts` — T01's internal mutations (completeChallenge, activateChallenge, checkDeadlines) already exist
- `packages/backend/convex/lib/challengeCompute.ts` — T01's `updateChallengeProgress` function
- `packages/backend/convex/schema.ts` — T01's schema with challenges + challengeParticipants tables and exported validators
- `packages/backend/convex/testing.ts` — existing 2306-line test helpers file with established patterns
- `packages/backend/scripts/verify-s01-m04.ts` — template for verification script structure (ConvexHttpClient, check helper, cleanup-before-test)
- S02-RESEARCH.md verification plan — CH-01 through CH-16 check definitions

## Expected Output

- `packages/backend/convex/challenges.ts` — expanded from ~100 lines (T01) to ~300-350 lines with 7 public + 3 internal functions
- `packages/backend/convex/testing.ts` — expanded from 2306 lines to ~2550-2600 lines with ~10 challenge test helpers + cleanup extension
- `packages/backend/scripts/verify-s02-m04.ts` — new file (~400-500 lines) with 16 named checks across 4 test users
