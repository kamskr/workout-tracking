---
estimated_steps: 4
estimated_files: 2
---

# T02: Add social test helpers to testing.ts and write verification script

**Slice:** S02 — Follow System & Activity Feed
**Milestone:** M003

## Description

Extend `testing.ts` with ~12 social test helpers that mirror the production `social.ts` functions using `testUserId` args instead of Clerk auth (D017/D079 pattern). Update `testFinishWorkout` to create feed items in lockstep with production (per S02-RESEARCH common pitfall). Extend `testCleanup` to delete all social data. Then write the authoritative 15-check verification script using 3 test users (A, B, C) that proves the entire follow system, feed, reactions, block filtering, pagination, and cascade delete contract.

## Steps

1. **Add social test helpers to `testing.ts`** — `testFollowUser(testUserId, followingId)`, `testUnfollowUser(testUserId, followingId)`, `testGetFollowStatus(testUserId, targetUserId)`, `testGetFollowCounts(userId)`, `testGetFeed(testUserId, paginationOpts)`, `testCreateFeedItem(testUserId, workoutId, summary)` (direct creation for bulk testing), `testAddReaction(testUserId, feedItemId, type)`, `testRemoveReaction(testUserId, feedItemId, type)`, `testGetReactionsForFeedItem(testUserId, feedItemId)`, `testBlockUser(testUserId, blockedId)`, `testUnblockUser(testUserId, blockedId)`, `testReportContent(testUserId, targetType, targetId, reason)`. All use `mutation`/`query` exports (not `internalMutation`) matching the existing pattern.

2. **Update `testFinishWorkout` and `testDeleteWorkout`** — `testFinishWorkout`: after setting completed status and computing duration, add non-fatal feed item creation (try/catch) — count exercises by workoutId, count PRs by workoutId, insert feedItems row with denormalized summary, type "workout_completed", isPublic true. Must mirror the production `finishWorkout` exactly. `testDeleteWorkout`: add cascade-delete of feedItems by_workoutId and their reactions by_feedItemId before the existing cascade logic.

3. **Extend `testCleanup`** — Before deleting templates and workouts, delete: follows (by_followerId), feedItems (by_authorId_createdAt filtered for userId), reactions for those feedItems (by_feedItemId), blocks (by_blockerId and by_blockedId to catch both directions), reports (by_reporterId). Order: social data first, then existing cleanup order (templates → workouts → PRs → prefs → profiles).

4. **Write `verify-s02-m03.ts`** — 15 checks using 3 test users (USER_A = "test-m03-s02-user-a", USER_B = "test-m03-s02-user-b", USER_C = "test-m03-s02-user-c"). Follow S01 verification pattern (ConvexHttpClient, check() function, cleanup on entry/exit, requirement tags). Checks:
   - F-01: Follow user (A follows B) — `testFollowUser` succeeds
   - F-02: Follow status returns true for A→B — `testGetFollowStatus` returns `{ isFollowing: true }`
   - F-03: Follow counts (B has 1 follower, A follows 1) — `testGetFollowCounts` correct
   - F-04: Duplicate follow is idempotent — `testFollowUser(A, B)` again succeeds without error
   - F-05: Self-follow rejected — `testFollowUser(A, A)` throws "Cannot follow yourself"
   - F-06: Feed item created on workout completion — B creates+finishes workout via `testCreateWorkout`→`testAddExercise`→`testLogSet`→`testFinishWorkout`, then `testGetFeed(B)` shows item OR query feedItems directly
   - F-07: Feed returns B's item for A (follower sees feed) — `testGetFeed(A)` returns item with B's workout
   - F-08: Feed does not return B's item for C (non-follower) — `testGetFeed(C)` returns empty
   - F-09: Reaction add (A reacts fire to B's feed item) — `testAddReaction` succeeds
   - F-10: Reaction retrieval shows count and user flag — `testGetReactionsForFeedItem(A, itemId)` returns `[{ type: "fire", count: 1, userHasReacted: true }]`
   - F-11: Reaction remove — `testRemoveReaction(A, itemId, "fire")` succeeds, count drops to 0
   - F-12: Block user (A blocks C) + C creates workout → C's items excluded from A's feed — A follows C first, C completes workout, A sees C's item, then A blocks C, A's feed no longer shows C's item
   - F-13: Unfollow (A unfollows B) → feed no longer shows B's items — `testUnfollowUser(A, B)`, `testGetFeed(A)` empty for B's items
   - F-14: Pagination with 50+ items — create 55 feed items for B via `testCreateFeedItem`, A follows B, paginate with initialNumItems=10, verify page sizes and cursor-based continuation
   - F-15: Feed item cascade-deleted when workout deleted — `testDeleteWorkout(B, workoutId)`, verify feed item and reactions removed

## Must-Haves

- [ ] All 12 test helpers compile and follow existing `testUserId` arg pattern
- [ ] `testFinishWorkout` creates feed items (mirrors production `finishWorkout`)
- [ ] `testDeleteWorkout` cascade-deletes feedItems and reactions
- [ ] `testCleanup` deletes follows, feedItems, reactions, blocks, reports for the test user
- [ ] `testGetFeed` accepts `paginationOpts` and returns paginated result
- [ ] `verify-s02-m03.ts` has 15 checks (F-01 through F-15) with 3 test users
- [ ] Verification script cleanup handles all 3 test users on entry and exit
- [ ] Script follows established pattern: `ConvexHttpClient`, `check()` function, requirement tags (`R016`)
- [ ] `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `npx tsx packages/backend/scripts/verify-s02-m03.ts` — 15/15 checks pass (when Convex CLI auth is available)
- Code review: `testFinishWorkout` has feed item creation matching production `finishWorkout`
- Code review: `testCleanup` deletes social data before existing cleanup

## Observability Impact

- Signals added/changed: Test helpers provide programmatic inspection of all social state — follow status, follow counts, feed contents, reaction counts, block status
- How a future agent inspects this: Call `testGetFollowStatus`, `testGetFollowCounts`, `testGetFeed`, `testGetReactionsForFeedItem` via ConvexHttpClient to inspect any test user's social state; run `verify-s02-m03.ts` for authoritative 15-check health check
- Failure state exposed: Verification script prints `❌ FAIL` with detail message for each failing check; exits with code 1 if any check fails; cleanup errors are non-fatal

## Inputs

- `packages/backend/convex/testing.ts` — Current test helpers (S01 added profile helpers)
- `packages/backend/convex/social.ts` — T01 output: production social functions to mirror in test helpers
- `packages/backend/convex/workouts.ts` — T01 output: finishWorkout with feed item creation pattern to mirror
- `packages/backend/scripts/verify-s01-m03.ts` — Established verification script pattern (check() function, ConvexHttpClient, cleanup)
- `packages/backend/convex/_generated/api.d.ts` — T01 output: includes social module

## Expected Output

- `packages/backend/convex/testing.ts` — ~12 new social test helpers, updated testFinishWorkout (feed item creation), updated testDeleteWorkout (cascade), updated testCleanup (social data)
- `packages/backend/scripts/verify-s02-m03.ts` — New: 15-check verification script with 3 test users proving follow/unfollow, feed, reactions, block filtering, pagination, cascade delete
