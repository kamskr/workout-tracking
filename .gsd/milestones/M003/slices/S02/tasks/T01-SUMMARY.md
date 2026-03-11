---
id: T01
parent: S02
milestone: M003
provides:
  - 5 social tables in Convex schema (follows, feedItems, reactions, blocks, reports)
  - social.ts module with 11 Convex functions (follow/unfollow, feed query, reactions, block/report)
  - Feed item creation in finishWorkout (non-fatal) and testFinishWorkout
  - Feed item + reaction cascade-delete in deleteWorkout and testDeleteWorkout
  - 12 social test helpers in testing.ts
  - testCleanup extended for all social tables
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/social.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/testing.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Exported reactionType, feedItemType, reportTargetType validators from schema.ts for reuse in social.ts and testing.ts
  - Feed query paginates full feedItems table by createdAt desc then post-filters for followed + not-blocked + isPublic (per D070 architecture)
  - reportContent is not idempotent (multiple reports with different reasons allowed) unlike follows/blocks/reactions which are idempotent
patterns_established:
  - Social mutation pattern: auth check → self-action guard → idempotency check via by_pair index → insert
  - Feed enrichment pattern: post-filter paginated results, resolve author profile via direct db query, compute reaction summary in-place
  - Cascade-delete pattern for social data: feedItems by_workoutId → delete reactions by_feedItemId → delete feedItem
  - Observability: structured console.error for non-fatal feed item creation, console.log for block cascade count
observability_surfaces:
  - "[Feed Item] Error creating feed item for workout {id}: {error}" — console.error in finishWorkout/testFinishWorkout on non-fatal failure
  - "[Block] Removed {count} follow relationships between {blockerId} and {blockedId}" — console.log on block cascade in blockUser/testBlockUser
  - Stable error messages: "Cannot follow yourself", "Cannot block yourself", "Not authenticated"
duration: 25m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add social tables to schema, create social.ts with all Convex functions, inject feed item creation into finishWorkout/deleteWorkout

**Built 5 social tables, 11 auth-gated social functions, 12 test helpers, and wired feed item lifecycle into workout mutations**

## What Happened

Added 5 new tables to the Convex schema (`follows`, `feedItems`, `reactions`, `blocks`, `reports`) with all required indexes per the S02-RESEARCH architecture. Created `social.ts` with 11 Convex functions covering the full social backend contract: follow/unfollow with self-follow rejection and idempotency, paginated feed query with post-filtering for followed users and block exclusion, reaction add/remove with unique constraints, block with cascade follow removal, and report creation.

Modified `finishWorkout` in `workouts.ts` to create a `feedItems` row on workout completion with a denormalized summary (`name`, `durationSeconds`, `exerciseCount`, `prCount`). The feed item creation is wrapped in try/catch (non-fatal) so workout completion always succeeds even if feed item insertion fails. Modified `deleteWorkout` to cascade-delete associated feed items and their reactions.

Added 12 social test helpers to `testing.ts` mirroring the auth-gated functions with `testUserId` args. Extended `testCleanup` to delete follows, feedItems, reactions, blocks, and reports in both directions. Updated `testFinishWorkout` and `testDeleteWorkout` to mirror the production feed item lifecycle changes.

Updated `_generated/api.d.ts` to include the social module.

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — **0 errors** ✅
- Code review: `finishWorkout` has try/catch around feed item creation (line 55) ✅
- Code review: `deleteWorkout` queries feedItems by_workoutId and deletes them + their reactions (lines 128-145) ✅
- Code review: `followUser` checks `userId === args.followingId` and throws "Cannot follow yourself" (social.ts line 33) ✅
- Code review: `getFeed` uses `paginationOptsValidator` and returns paginated result with author profiles and reaction summaries ✅
- Code review: `blockUser` cascade-removes follows in both directions and logs removal count ✅
- Code review: `addReaction` checks unique constraint via `by_feedItemId_userId_type` index (idempotent) ✅
- Code review: Feed item summary includes `{ name, durationSeconds, exerciseCount, prCount }` ✅

### Slice-level checks (partial — T01 is intermediate):
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors ✅
- Diagnostic check: finishWorkout feed item creation is non-fatal ✅
- Verification script (T02) — not yet written (expected)
- Browser assertions (T03) — not yet built (expected)

## Diagnostics

- Query `feedItems` table via `testGetFeed` or `testCreateFeedItem` test helpers to verify feed items exist after workout completion
- Query `follows` table via `testGetFollowStatus` / `testGetFollowCounts` to verify follow state
- Check `social.ts` exports via `api.social.*` types in `_generated/api.d.ts`
- Non-fatal feed item creation failures logged with `[Feed Item] Error creating feed item for workout {id}: {error}`
- Block cascade logged with `[Block] Removed {count} follow relationships between {blockerId} and {blockedId}`

## Deviations

- Added social test helpers to testing.ts in T01 (plan allocated them to T02) because they were needed to mirror production finishWorkout/deleteWorkout changes and keep testing.ts in sync with workouts.ts changes made in this task. This reduces T02 scope to just writing the verification script.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added 5 social tables (follows, feedItems, reactions, blocks, reports) with all indexes, exported shared validators (feedItemType, reactionType, reportTargetType)
- `packages/backend/convex/social.ts` — **New**: 11 Convex functions (followUser, unfollowUser, getFollowStatus, getFollowCounts, getFeed, addReaction, removeReaction, getReactionsForFeedItem, blockUser, unblockUser, reportContent)
- `packages/backend/convex/workouts.ts` — finishWorkout creates feed item (non-fatal try/catch), deleteWorkout cascade-deletes feedItems and reactions
- `packages/backend/convex/testing.ts` — 12 social test helpers, testFinishWorkout creates feed items, testDeleteWorkout cascade-deletes, testCleanup extended for social tables
- `packages/backend/convex/_generated/api.d.ts` — Added social module import and type registration
