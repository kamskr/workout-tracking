# S02: Follow System & Activity Feed — Research

**Date:** 2026-03-11

## Summary

S02 adds the follow system, realtime activity feed, reactions, and block/report infrastructure to the workout app. This is the highest-risk slice in M003 — it introduces 5 new tables (`follows`, `feedItems`, `reactions`, `blocks`, `reports`), the first cross-user write patterns, the first paginated query, and the first mutation that creates data in a different user's observable surface (feed items). The primary requirement is R016 (Follow System and Activity Feed).

The core architectural challenge is the **feed query**. Convex's `.paginate()` operates on a single indexed query — it cannot fan out across multiple `authorId` values in one paginated call. The roadmap decision D070 specifies a hybrid: a `feedItems` denormalization table (one row per event, inserted on workout completion) queried with fan-out-on-read. The implementation must use a **`by_createdAt` global index on `feedItems`**, paginate over it in reverse chronological order, and post-filter to include only items from followed users (excluding blocked). This is efficient because: (a) the `feedItems` table only contains shareable events (not all workouts), (b) post-filtering at most ~50 items per page is well within Convex's 10-second timeout, and (c) Convex's reactive subscriptions on a single-table paginated query recompute efficiently (only when the feedItems table changes, not when any followed user's workout changes — this is the key win of denormalization). An alternative approach — querying feedItems with a compound index `by_authorId_createdAt` per followed user and merging results — would require N separate queries (one per followed user) and can't use `.paginate()`, making cursor-based pagination impossible. The single-table paginate + post-filter approach is the correct design.

The second concern is **feed item creation inside `finishWorkout`**. Both the auth-gated `finishWorkout` mutation (in `workouts.ts`) and the test helper `testFinishWorkout` (in `testing.ts`) must insert a `feedItems` row on workout completion. This is a cross-cutting change to existing mutations — the only S02 change that touches existing code beyond schema. The feed item creation must be non-fatal (try/catch, like PR detection in D052) to prevent feed bugs from blocking workout completion, which is the primary user action. The feed item should capture a denormalized summary snapshot (workout name, duration, exercise count, PR count) at creation time per D074.

Reactions use a `by_feedItemId` index for efficient retrieval and a unique constraint enforced in mutation logic (`by_feedItemId_userId_type` index — one reaction of each type per user per feed item). Block filtering applies at query time: the feed query collects the blocker's block list and excludes those authorIds from results. The `blocks` and `reports` tables are simple — no complex logic, just CRUD with indexes.

## Recommendation

### Approach: 5 new tables, ~15 Convex functions, feed page + profile follow UI

**T01 (Backend — Schema + Core Mutations):** Add 5 tables to schema (`follows`, `feedItems`, `reactions`, `blocks`, `reports`). Create `social.ts` (or split into `follows.ts`, `feed.ts`, `reactions.ts`, `blocks.ts`) with follow/unfollow mutations, feed query, reaction mutations, block/report mutations. Modify `finishWorkout` and `testFinishWorkout` to create feed items. Add ~10 test helpers to `testing.ts`. Extend `testCleanup` to delete all social data.

**T02 (Backend — Verification Script):** Create `verify-s02-m03.ts` with ~15 checks covering: follow/unfollow cycle, feed item creation on workout completion, feed query returns followed users' items in order, reactions add/remove, block filtering excludes blocked user from feed, pagination (50+ items load correctly), duplicate follow is idempotent, self-follow rejected, feed item cascade delete on workout delete.

**T03 (Web UI — Feed Page + Follow UI):** Build `/feed` page with `usePaginatedQuery` showing realtime feed items, "Load More" button, reaction buttons (fire 🔥, fist bump 🤜, clap 👏, strong arm 💪, trophy 🏆), empty state. Add follow/unfollow button to `/profile/[username]` page. Add user search for follow discovery (reuses `searchProfiles`). Add `/feed` to middleware protected routes and header navigation.

### Why this ordering

T01 first because everything depends on the backend contract. T02 before T03 because verification proves the backend works before building UI on top. T03 last because it consumes proven backend functions.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Paginated feed query | Convex `paginationOptsValidator` + `.paginate()` + `usePaginatedQuery` | Built-in cursor-based pagination. Already documented. Handles cursor management, reactive updates, and "Load More" flow. |
| User discovery for follow | S01's `searchProfiles` query with Convex search index on `displayName` | Already built and tested. Same full-text search pattern used for exercise search. |
| Profile data for feed item author | S01's `getProfile` / `getProfileByUsername` queries | Already cross-user readable (S01 pattern). No new profile queries needed. |
| Realtime feed updates | Convex reactive subscriptions via `usePaginatedQuery` | Same mechanism as workout list, PR badges, analytics. No WebSocket setup needed. |
| Feed item creation on workout completion | Insert inside existing `finishWorkout` mutation | Atomic with workout status change — no separate scheduled function needed. Convex mutations are transactional. |
| Test helpers for multi-user scenarios | Extend existing `testing.ts` pattern (D017/D079) | Same `testUserId` arg pattern, same `ConvexHttpClient` verification approach. |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — S01 added `profiles` table. S02 adds 5 more tables. The `workouts` table needs no schema change (D070 uses a separate `feedItems` table, D073's `isPublic` field deferred to S03). All userId fields are `v.string()` (Clerk subject).
- `packages/backend/convex/profiles.ts` — `getProfile` query fetches any user's profile by userId (cross-user read pattern). Feed UI uses this to display author info on feed items. `searchProfiles` is the user discovery mechanism for the follow flow.
- `packages/backend/convex/workouts.ts` — `finishWorkout` mutation is where feed item creation must be injected. Currently sets `status: "completed"`, `completedAt`, `durationSeconds`. Must add: count exercises, count PRs, insert `feedItems` row. Also `deleteWorkout` needs cascade delete of associated feed items.
- `packages/backend/convex/testing.ts` — `testFinishWorkout` must also insert feed items (mirrors production `finishWorkout`). `testCleanup` must delete follows, feedItems, reactions, blocks, reports for the test user. Current cleanup order: templates → workouts → personalRecords → userPreferences → profiles. Social tables insert before profiles in cleanup.
- `packages/backend/convex/lib/auth.ts` — `getUserId()` returns Clerk subject string. All S02 mutations need auth. Feed query needs auth to identify the viewer (whose followed users to show, whose blocks to enforce).
- `packages/backend/convex/_generated/api.d.ts` — Manually edited in S01 (profiles module added). S02 adds new modules (social/follows/feed/etc). Either manually add or (better) run `npx convex dev` to regenerate. **S01 Forward Intelligence warns this is fragile.**
- `packages/backend/scripts/verify-s01-m03.ts` — Established verification pattern: `ConvexHttpClient`, two test users, cleanup on entry/exit, structured `check()` function, requirement tags. S02 script follows this exactly but needs 3+ test users (User A follows User B, User C is blocked).
- `apps/web/src/middleware.ts` — Protected routes include `/profile(.*)`. Must add `/feed(.*)`.
- `apps/web/src/app/profile/[username]/page.tsx` — Profile view page where follow/unfollow button will be added. Currently shows avatar, name, bio, stats, inline edit. S02 adds: follow/unfollow button (for non-own profiles), follower/following counts.
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — Shows existing page layout pattern: header with actions, loading state, empty state, list rendering. Feed page follows same structure but with `usePaginatedQuery` instead of `useQuery`.

## Constraints

- **Convex `.paginate()` only works on a single indexed query.** Cannot do `WHERE authorId IN (list) ORDER BY createdAt DESC`. Must paginate the full `feedItems` table (by `createdAt` desc) and post-filter for followed users. This means pages may have fewer than `numItems` results after filtering. The client handles this naturally — `usePaginatedQuery` shows `CanLoadMore` as long as there are more pages, and the user taps "Load More" until they have enough content. This is acceptable UX for a social feed.
- **Convex mutations are transactional with 8K document write limit.** Feed item creation inside `finishWorkout` adds 1 write — negligible. Reaction add/remove is 1 write. Follow/unfollow is 1 write. No concern at this scale.
- **Convex queries must terminate within 10 seconds and read ≤16K documents.** Feed query: paginate 50 items from `feedItems`, for each resolve author profile (50 reads) + reactions (50 reads) = ~150 reads. Even with post-filtering reading 200 items to get 50 matching, that's ~600 reads. Well within limits.
- **Post-filter pagination may return empty pages.** If a user follows nobody and the feedItems table has items from unfollowed users, every page will filter to zero items. Need a `take`/`limit` safeguard: if after filtering a page has zero results and `isDone` is false, the client should auto-load the next page. Or: limit the total number of pages scanned server-side to prevent infinite empty-page loops.
- **userId is Clerk subject string, not Convex document ID.** `follows` table uses `followerId`/`followingId` as strings. Index on `by_followerId` for "who does user X follow" and `by_followingId` for "who follows user X" (for follower counts).
- **`_generated/api.d.ts` requires update for new modules.** Either run `npx convex dev` (preferred) or manually add imports. S01 forward intelligence flagged this as fragile.
- **Pre-existing dependency issues.** Web app has `clsx` module error, native app has `convex/react` module error — both pre-existing, not introduced by S01 or S02.
- **S01 verification script still unexecuted.** Convex CLI auth blocker from S01 session. Should be resolved before S02 but is not blocking S02 code authoring — only live verification execution.

## Common Pitfalls

- **Feed query scanning too many documents** — If `feedItems` table grows large but a user follows few people, the feed query will scan many irrelevant items. Mitigation: set a maximum scan limit (e.g., scan at most 500 items before returning partial results). At the expected scale (<1000 total feed items), this won't be hit, but the guard prevents future performance cliffs.
- **Infinite empty-page loop in post-filter pagination** — If the filter removes all items from every page, `usePaginatedQuery` could keep requesting pages forever. Mitigation: server-side, if after filtering the page is empty and there are more results, automatically fetch the next page up to a max retry count (e.g., 5 pages). Return whatever accumulated results + the continuation cursor. This prevents the client from needing to handle empty pages.
- **Feed item not created when using `testFinishWorkout`** — Test helper mirrors production logic. If feed item insertion is added to `finishWorkout` but not `testFinishWorkout`, verification scripts won't see feed items after workout completion. Must update both in lockstep.
- **Stale feed item after workout deletion** — D074 says feed items are immutable snapshots. But if a workout is deleted, the feed item should also be deleted (cascade). `deleteWorkout` must query `feedItems` by `workoutId` index and delete matching rows. Also delete associated reactions for those feed items.
- **Self-follow** — User should not be able to follow themselves. `followUser` mutation must reject `followerId === followingId`.
- **Duplicate follow** — Following someone already followed should be idempotent (no error, no duplicate row). Check `by_pair` index before inserting.
- **Block does not cascade-remove follow** — When User A blocks User B, should existing follow relationships be removed? Recommended: yes — `blockUser` should also delete any follow entries between the two users (both directions). Otherwise blocked user's old content still lingers in the feed query results even after the follow-based filter would exclude them.
- **Reaction count display vs. individual reactions** — Feed UI needs to show reaction counts per type AND whether the current user has reacted. The reaction query should return both: `{ type, count, userHasReacted }[]` per feed item. This requires reading all reactions for a feed item and checking if the current userId is in the list.
- **Missing profile for feed item author** — A feed item's `authorId` references a Clerk subject string. If that user's profile was somehow deleted, the feed query must handle `null` profile gracefully (skip or show "Unknown User").
- **Reaction type validation** — Accept only the defined reaction types (fire, fistBump, clap, strongArm, trophy). Validate in mutation via `v.union(v.literal(...))`.

## Open Risks

- **Post-filter pagination UX** — The "scan many, return few" approach means the first load might be slow if the user follows very few people among many total feed items. At current scale this is fine. If the app grows to thousands of users with heavy posting, a true fan-out-on-write (pre-materialized per-follower feed) would be needed. D070 explicitly marks this as revisable.
- **Feed item creation atomicity with workout completion** — Feed item insertion inside `finishWorkout` adds a write to a critical mutation. If the feedItems table has a schema mismatch or the summary computation fails, it could break workout completion. Mitigation: wrap in try/catch (mirror D052 PR detection pattern). Non-fatal failure logged, workout still completes.
- **Convex OCC (Optimistic Concurrency Control) on follow/unfollow** — Two simultaneous follow requests for the same pair could race past the uniqueness check. Convex OCC handles this: if both reads see no existing follow and both try to write, one will succeed and the other will be retried, at which point it sees the existing follow and becomes idempotent. This is the same pattern used for profile creation in S01.
- **Feed UI realtime updates** — `usePaginatedQuery` reactively updates when the underlying data changes. A new feed item from a followed user will cause the query to re-run and the new item to appear. However, with post-filtering, the reactive invalidation fires for ANY feedItems table change (including items from unfollowed users). This is the cost of the single-table approach — but Convex is optimized for this and the recomputation is bounded by page size.
- **Reaction count race conditions** — Two users reacting simultaneously to the same feed item is safe (separate rows). One user adding then quickly removing a reaction could race. Convex OCC handles this correctly.
- **PR count in feed item summary** — To include `prCount` in the denormalized summary, the feed item creation must count PRs achieved during the workout. This data is in `personalRecords` table indexed by `workoutId`. Must query this inside `finishWorkout` before creating the feed item.

## Feed Query Architecture (Detail)

The feed query strategy deserves explicit documentation since it's the highest-risk component:

### Schema
```
feedItems:
  authorId: v.string()                    // Clerk subject of the poster
  type: "workout_completed"               // extensible for S03 "workout_shared"
  workoutId: v.id("workouts")             // source workout
  summary: v.object({                     // denormalized snapshot (D074)
    name: v.string(),
    durationSeconds: v.number(),
    exerciseCount: v.number(),
    prCount: v.number(),
  })
  isPublic: v.boolean()                   // always true in S02, S03 adds privacy
  createdAt: v.number()
  indexes:
    by_createdAt: ["createdAt"]           // primary feed pagination index
    by_authorId_createdAt: ["authorId", "createdAt"]  // profile activity queries
    by_workoutId: ["workoutId"]           // cascade delete, dedup
```

### Query Flow
1. Get current user's follow list: `follows.withIndex("by_followerId", q => q.eq("followerId", userId)).collect()` → Set of followedIds
2. Get current user's block list: `blocks.withIndex("by_blockerId", q => q.eq("blockerId", userId)).collect()` → Set of blockedIds
3. Paginate `feedItems` by `createdAt` desc: `feedItems.order("desc").paginate(paginationOpts)`
4. Post-filter: keep only items where `authorId ∈ followedIds AND authorId ∉ blockedIds AND isPublic === true`
5. For each surviving item, resolve author profile and reaction summary
6. Return paginated result with filtered page

### Why not `by_authorId_createdAt` per-user merge?
Would require N separate indexed queries (one per followed user), merge-sort results by createdAt, and manage N cursors. Can't use `.paginate()`. Much more complex, and Convex subscription invalidation would fire on each followed user's feedItems changes (N subscriptions vs. 1).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (125 installs) | available — relevant for access control patterns, helpers |
| Convex | `get-convex/agent-skills@function-creator` (113 installs) | available — relevant for creating 15+ new functions |
| Convex | `get-convex/agent-skills@schema-builder` (108 installs) | available — relevant for 5 new tables |
| Convex | `get-convex/agent-skills@migration-helper` (86 installs) | available — potentially useful if schema push has issues |
| Frontend | `frontend-design` | installed — for feed and social UI components |

**Recommendation:** Consider installing `get-convex/agent-skills@schema-builder` (most impactful for S02 — 5 new tables) and `get-convex/agent-skills@function-creator` (15+ new Convex functions). Both are highly relevant to the bulk of S02 work.

## Task Breakdown (Advisory)

### T01: Backend — Schema + Mutations (~45 min)
- Add 5 tables to `schema.ts`: `follows`, `feedItems`, `reactions`, `blocks`, `reports`
- Create `social.ts` with: `followUser`, `unfollowUser`, `getFollowStatus`, `getFollowCounts`, `getFeed` (paginated), `addReaction`, `removeReaction`, `getReactionsForFeedItem`, `blockUser`, `unblockUser`, `reportContent`
- Modify `workouts.ts` `finishWorkout` to insert `feedItems` row (non-fatal, try/catch)
- Modify `workouts.ts` `deleteWorkout` to cascade-delete `feedItems` and their `reactions`
- Add ~12 test helpers to `testing.ts`: `testFollowUser`, `testUnfollowUser`, `testGetFollowStatus`, `testGetFeed`, `testCreateFeedItem`, `testAddReaction`, `testRemoveReaction`, `testGetReactionsForFeedItem`, `testBlockUser`, `testUnblockUser`, `testGetFollowCounts`, `testReportContent`
- Extend `testCleanup` to delete follows, feedItems, reactions, blocks, reports
- Update `_generated/api.d.ts` (add social module)

### T02: Backend — Verification Script (~30 min)
- `verify-s02-m03.ts` with ~15 checks using 3 test users (A, B, C):
  - F-01: Follow user (A follows B)
  - F-02: Follow status returns true for A→B
  - F-03: Follow counts (B has 1 follower, A follows 1)
  - F-04: Duplicate follow is idempotent (no error)
  - F-05: Self-follow rejected
  - F-06: Feed item created on workout completion (B completes workout, feedItem exists)
  - F-07: Feed returns B's item for A (follower sees feed)
  - F-08: Feed does not return B's item for C (non-follower doesn't see)
  - F-09: Reaction add (A reacts to B's feed item)
  - F-10: Reaction retrieval shows count and user flag
  - F-11: Reaction remove
  - F-12: Block user (A blocks C), C's items excluded from A's feed
  - F-13: Unfollow (A unfollows B), feed no longer shows B's items
  - F-14: Pagination with 50+ items (create many feed items, verify paginated load)
  - F-15: Feed item cascade deleted when workout deleted

### T03: Web UI — Feed Page + Follow UI (~30 min)
- `/feed` page with `usePaginatedQuery` consuming `getFeed`
- `FeedItem` component: author avatar/name, workout summary, timestamp, reaction bar
- `ReactionBar` component: 5 emoji buttons with counts, toggle state
- Empty feed state: "Follow users to see their workouts here"
- Follow/unfollow button on `/profile/[username]` page
- User search modal/section for discovering users to follow (reuses `searchProfiles`)
- Add `/feed(.*)` to middleware protected routes
- Add "Feed" link to navigation (Header or sidebar)
- Data attributes: `data-feed-page`, `data-feed-item`, `data-reaction-bar`, `data-follow-button`

## Sources

- Convex pagination documentation — `paginationOptsValidator`, `.paginate()`, `usePaginatedQuery` with cursor-based pagination (source: [Convex Pagination](https://docs.convex.dev/database/pagination))
- Convex reactive subscriptions — `useQuery` and `usePaginatedQuery` auto-rerender on data change (source: [Convex React Client](https://docs.convex.dev/client/react))
- Convex compound indexes and query filtering (source: [Convex Indexes](https://docs.convex.dev/database/indexes))
- Convex system fields — `_creationTime` auto-added to all documents (source: [Convex Types](https://docs.convex.dev/using/types))
- Existing codebase: schema.ts, profiles.ts, workouts.ts, testing.ts, analytics.ts, verify-s01-m03.ts, middleware.ts, profile/[username]/page.tsx
- M003-RESEARCH.md feed architecture analysis — hybrid denormalization with `feedItems` table
- D070 (feed architecture), D074 (immutable snapshots), D079 (multi-user test helpers)
