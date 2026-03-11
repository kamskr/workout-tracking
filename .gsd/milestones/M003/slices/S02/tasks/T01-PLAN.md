---
estimated_steps: 5
estimated_files: 4
---

# T01: Add social tables to schema, create social.ts with all Convex functions, inject feed item creation into finishWorkout/deleteWorkout

**Slice:** S02 — Follow System & Activity Feed
**Milestone:** M003

## Description

Build the entire backend contract for the follow system, activity feed, reactions, and block/report infrastructure. This is 5 new tables in the Convex schema, a new `social.ts` module with ~11 Convex functions, and cross-cutting changes to `finishWorkout` and `deleteWorkout` for feed item lifecycle management. The feed query uses the hybrid denormalization architecture from D070 — paginate the full `feedItems` table by `createdAt` desc and post-filter for followed users, excluding blocked.

## Steps

1. **Add 5 tables to `schema.ts`** — `follows` (followerId, followingId, createdAt; indexes: by_followerId, by_followingId, by_pair), `feedItems` (authorId, type, workoutId, summary object, isPublic, createdAt; indexes: by_createdAt, by_authorId_createdAt, by_workoutId), `reactions` (feedItemId, userId, type, createdAt; indexes: by_feedItemId, by_feedItemId_userId_type), `blocks` (blockerId, blockedId, createdAt; indexes: by_blockerId, by_blockedId, by_pair), `reports` (reporterId, targetType, targetId, reason, createdAt; index: by_reporterId). Define shared validators for reaction types and feed item types.

2. **Create `social.ts` with follow mutations** — `followUser(followingId)`: auth check, reject self-follow, check existing via by_pair index (idempotent), insert. `unfollowUser(followingId)`: auth check, find by pair, delete if exists (idempotent). `getFollowStatus(targetUserId)`: returns `{ isFollowing, isFollowedBy }`. `getFollowCounts(userId)`: returns `{ followers, following }` counts.

3. **Add feed query and reaction mutations to `social.ts`** — `getFeed(paginationOpts)`: get viewer's follow list and block list, paginate `feedItems` by createdAt desc, post-filter (authorId in followed, not in blocked, isPublic true), for each surviving item resolve author profile via `getProfile` pattern (direct db query, not function call) and reaction summary `{ type, count, userHasReacted }[]`. Return paginated result. `addReaction(feedItemId, type)`: validate reaction type (fire/fistBump/clap/strongArm/trophy), check unique constraint via by_feedItemId_userId_type index, insert if not exists (idempotent). `removeReaction(feedItemId, type)`: find by feedItemId+userId+type index, delete if exists. `getReactionsForFeedItem(feedItemId)`: returns `{ type, count, userHasReacted }[]` grouped by type.

4. **Add block/report mutations to `social.ts`** — `blockUser(blockedId)`: auth check, reject self-block, check existing via by_pair index (idempotent), insert block, cascade-remove follow relationships in both directions. `unblockUser(blockedId)`: find by pair, delete if exists. `reportContent(targetType, targetId, reason)`: insert report row.

5. **Modify `workouts.ts` and update generated types** — In `finishWorkout`: after setting completed status, wrap in try/catch: count exercises (query workoutExercises by workoutId), count PRs (query personalRecords by workoutId), insert `feedItems` row with denormalized summary `{ name, durationSeconds, exerciseCount, prCount }`, type "workout_completed", isPublic true. In `deleteWorkout`: after cascade-deleting sets and workoutExercises, query feedItems by_workoutId index, for each delete associated reactions (by_feedItemId), then delete feed item. Update `_generated/api.d.ts` to add social module import.

## Must-Haves

- [ ] 5 tables with correct fields, types, and indexes per S02-RESEARCH schema
- [ ] Reaction type validator: `v.union(v.literal("fire"), v.literal("fistBump"), v.literal("clap"), v.literal("strongArm"), v.literal("trophy"))`
- [ ] `followUser` rejects self-follow with "Cannot follow yourself" error
- [ ] `followUser` is idempotent — following someone already followed returns without error or duplicate
- [ ] `getFeed` uses `paginationOptsValidator` and `.paginate()` — post-filters for followed + not-blocked + isPublic
- [ ] `getFeed` resolves author profile (displayName, username, avatarUrl) and reaction summary per feed item
- [ ] `addReaction` enforces unique constraint per feedItemId+userId+type (idempotent, not duplicate)
- [ ] `blockUser` cascade-removes follow relationships in both directions
- [ ] `finishWorkout` feed item creation is non-fatal (try/catch, workout completion always succeeds)
- [ ] `finishWorkout` feed item summary includes `{ name, durationSeconds, exerciseCount, prCount }`
- [ ] `deleteWorkout` cascade-deletes associated feedItems and their reactions
- [ ] `_generated/api.d.ts` includes social module
- [ ] `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- Code review: `finishWorkout` has try/catch around feed item creation
- Code review: `deleteWorkout` queries feedItems by_workoutId and deletes them + their reactions
- Code review: `followUser` checks `followerId === followingId` and throws "Cannot follow yourself"
- Code review: `getFeed` uses `paginationOptsValidator` and returns paginated result with author profiles

## Observability Impact

- Signals added/changed: `[Feed Item] Error creating feed item for workout {id}: {error}` console.error in `finishWorkout` on non-fatal failure; `[Block] Removed {count} follow relationships between {blockerId} and {blockedId}` console.log on block cascade
- How a future agent inspects this: Query `feedItems` table via test helpers (T02) to verify feed items exist after workout completion; query `follows` table to verify follow state; check `social.ts` exports via `api.d.ts` types
- Failure state exposed: Feed item creation failure is logged with workout ID but does not surface to the user (non-fatal); social mutation errors throw descriptive messages ("Cannot follow yourself", "User not found", "Already blocked")

## Inputs

- `packages/backend/convex/schema.ts` — Current schema with profiles table (S01)
- `packages/backend/convex/workouts.ts` — Current finishWorkout and deleteWorkout mutations
- `packages/backend/convex/profiles.ts` — Cross-user read pattern, `resolveAvatarUrl` pattern (for feed item author resolution)
- `packages/backend/convex/_generated/api.d.ts` — Current generated types with profiles module
- S02-RESEARCH.md — Feed query architecture, schema details, constraint analysis

## Expected Output

- `packages/backend/convex/schema.ts` — 5 new tables added (follows, feedItems, reactions, blocks, reports)
- `packages/backend/convex/social.ts` — New file: ~11 Convex functions (followUser, unfollowUser, getFollowStatus, getFollowCounts, getFeed, addReaction, removeReaction, getReactionsForFeedItem, blockUser, unblockUser, reportContent)
- `packages/backend/convex/workouts.ts` — finishWorkout creates feed item (non-fatal), deleteWorkout cascade-deletes feed items and reactions
- `packages/backend/convex/_generated/api.d.ts` — social module added to imports and API type
