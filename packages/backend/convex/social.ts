/**
 * Social functions: follow system, activity feed, reactions, block/report.
 *
 * Stable error messages consumed by UI:
 * - "Cannot follow yourself"
 * - "Cannot block yourself"
 * - "Not authenticated"
 *
 * Observability:
 * - [Block] Removed {count} follow relationships between {blockerId} and {blockedId}
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getUserId } from "./lib/auth";
import { reactionType, reportTargetType } from "./schema";

// ── Follow Mutations ─────────────────────────────────────────────────────────

/**
 * Follow a user. Idempotent — following someone already followed is a no-op.
 * Rejects self-follow with "Cannot follow yourself".
 */
export const followUser = mutation({
  args: {
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.followingId) {
      throw new Error("Cannot follow yourself");
    }

    // Idempotent: check if already following via by_pair index
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    if (existing) return existing._id;

    const followId = await ctx.db.insert("follows", {
      followerId: userId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });

    return followId;
  },
});

/**
 * Unfollow a user. Idempotent — unfollowing someone not followed is a no-op.
 */
export const unfollowUser = mutation({
  args: {
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get follow status between the authenticated user and a target user.
 * Returns { isFollowing, isFollowedBy }.
 */
export const getFollowStatus = query({
  args: {
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", userId).eq("followingId", args.targetUserId),
        )
        .first(),
      ctx.db
        .query("follows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", args.targetUserId).eq("followingId", userId),
        )
        .first(),
    ]);

    return {
      isFollowing: !!outgoing,
      isFollowedBy: !!incoming,
    };
  },
});

/**
 * Get follower/following counts for a user.
 */
export const getFollowCounts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await getUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const [followers, following] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_followerId", (q) => q.eq("followerId", args.userId))
        .collect(),
    ]);

    return {
      followers: followers.length,
      following: following.length,
    };
  },
});

// ── Feed Query ───────────────────────────────────────────────────────────────

/**
 * Get the activity feed for the authenticated user.
 * Paginates the feedItems table by createdAt desc, post-filters for followed
 * users (excluding blocked, only isPublic). Resolves author profile and
 * reaction summary per item.
 *
 * Uses the hybrid denormalization architecture from D070.
 */
export const getFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Get follow list
    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", userId))
      .collect();
    const followedIds = new Set(followRows.map((f) => f.followingId));

    // 2. Get block list
    const blockRows = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId", (q) => q.eq("blockerId", userId))
      .collect();
    const blockedIds = new Set(blockRows.map((b) => b.blockedId));

    // 3. Paginate feedItems by createdAt desc
    const paginatedResult = await ctx.db
      .query("feedItems")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);

    // 4. Post-filter: followed + not blocked + isPublic
    const filteredItems = paginatedResult.page.filter(
      (item) =>
        followedIds.has(item.authorId) &&
        !blockedIds.has(item.authorId) &&
        item.isPublic,
    );

    // 5. Resolve author profiles and reaction summaries
    const enrichedItems = await Promise.all(
      filteredItems.map(async (item) => {
        // Resolve author profile (direct db query, not function call)
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", item.authorId))
          .first();

        let avatarUrl: string | null = null;
        if (authorProfile?.avatarStorageId) {
          avatarUrl =
            (await ctx.storage.getUrl(authorProfile.avatarStorageId)) ?? null;
        }

        const author = authorProfile
          ? {
              displayName: authorProfile.displayName,
              username: authorProfile.username,
              avatarUrl,
            }
          : { displayName: "Unknown User", username: "unknown", avatarUrl: null };

        // Resolve reaction summary
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_feedItemId", (q) => q.eq("feedItemId", item._id))
          .collect();

        const reactionCounts = new Map<
          string,
          { count: number; userHasReacted: boolean }
        >();
        for (const r of reactions) {
          const entry = reactionCounts.get(r.type) ?? {
            count: 0,
            userHasReacted: false,
          };
          entry.count++;
          if (r.userId === userId) entry.userHasReacted = true;
          reactionCounts.set(r.type, entry);
        }

        const reactionSummary = Array.from(reactionCounts.entries()).map(
          ([type, data]) => ({
            type,
            count: data.count,
            userHasReacted: data.userHasReacted,
          }),
        );

        return {
          ...item,
          author,
          reactions: reactionSummary,
        };
      }),
    );

    return {
      ...paginatedResult,
      page: enrichedItems,
    };
  },
});

// ── Reaction Mutations ───────────────────────────────────────────────────────

/**
 * Add a reaction to a feed item. Idempotent — adding the same reaction
 * type to the same feed item is a no-op. Enforces one reaction per
 * feedItemId+userId+type via by_feedItemId_userId_type index.
 */
export const addReaction = mutation({
  args: {
    feedItemId: v.id("feedItems"),
    type: reactionType,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check unique constraint
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId_userId_type", (q) =>
        q
          .eq("feedItemId", args.feedItemId)
          .eq("userId", userId)
          .eq("type", args.type),
      )
      .first();

    if (existing) return existing._id;

    const reactionId = await ctx.db.insert("reactions", {
      feedItemId: args.feedItemId,
      userId,
      type: args.type,
      createdAt: Date.now(),
    });

    return reactionId;
  },
});

/**
 * Remove a reaction from a feed item. Idempotent — removing a reaction
 * that doesn't exist is a no-op.
 */
export const removeReaction = mutation({
  args: {
    feedItemId: v.id("feedItems"),
    type: reactionType,
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId_userId_type", (q) =>
        q
          .eq("feedItemId", args.feedItemId)
          .eq("userId", userId)
          .eq("type", args.type),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get reaction summary for a feed item.
 * Returns { type, count, userHasReacted }[] grouped by type.
 */
export const getReactionsForFeedItem = query({
  args: {
    feedItemId: v.id("feedItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId", (q) => q.eq("feedItemId", args.feedItemId))
      .collect();

    const reactionCounts = new Map<
      string,
      { count: number; userHasReacted: boolean }
    >();
    for (const r of reactions) {
      const entry = reactionCounts.get(r.type) ?? {
        count: 0,
        userHasReacted: false,
      };
      entry.count++;
      if (r.userId === userId) entry.userHasReacted = true;
      reactionCounts.set(r.type, entry);
    }

    return Array.from(reactionCounts.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      userHasReacted: data.userHasReacted,
    }));
  },
});

// ── Block/Report Mutations ───────────────────────────────────────────────────

/**
 * Block a user. Idempotent. Cascade-removes follow relationships
 * in both directions between the two users.
 */
export const blockUser = mutation({
  args: {
    blockedId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.blockedId) {
      throw new Error("Cannot block yourself");
    }

    // Idempotent: check if already blocked
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", userId).eq("blockedId", args.blockedId),
      )
      .first();

    if (existing) return existing._id;

    // Insert block
    const blockId = await ctx.db.insert("blocks", {
      blockerId: userId,
      blockedId: args.blockedId,
      createdAt: Date.now(),
    });

    // Cascade-remove follow relationships in both directions
    let removedCount = 0;

    // User → blocked (blocker was following blocked)
    const follow1 = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.blockedId),
      )
      .first();
    if (follow1) {
      await ctx.db.delete(follow1._id);
      removedCount++;
    }

    // Blocked → user (blocked was following blocker)
    const follow2 = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", args.blockedId).eq("followingId", userId),
      )
      .first();
    if (follow2) {
      await ctx.db.delete(follow2._id);
      removedCount++;
    }

    if (removedCount > 0) {
      console.log(
        `[Block] Removed ${removedCount} follow relationships between ${userId} and ${args.blockedId}`,
      );
    }

    return blockId;
  },
});

/**
 * Unblock a user. Idempotent — unblocking someone not blocked is a no-op.
 */
export const unblockUser = mutation({
  args: {
    blockedId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", userId).eq("blockedId", args.blockedId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Report content (feed item or profile). Always inserts — not idempotent
 * (a user can report the same content multiple times with different reasons).
 */
export const reportContent = mutation({
  args: {
    targetType: reportTargetType,
    targetId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reportId = await ctx.db.insert("reports", {
      reporterId: userId,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      createdAt: Date.now(),
    });

    return reportId;
  },
});
