/**
 * Leaderboard query and mutation functions.
 *
 * Auth-gated functions for reading ranked leaderboard data and managing opt-in.
 * All ranking queries post-filter by leaderboardOptIn on the profiles table —
 * entries are written regardless of opt-in status (D114), but only opted-in
 * users appear in public rankings.
 *
 * Observability:
 *   - getLeaderboard returns { entries, totalEntries } — totalEntries is the
 *     pre-filter count for diagnosing opt-in ratio issues.
 *   - getMyRank returns { rank, value, totalScanned } for scan diagnostics.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { leaderboardMetric } from "./schema";
import { Id } from "./_generated/dataModel";

// ── getLeaderboard ───────────────────────────────────────────────────────────

/**
 * Top-N leaderboard for a given exercise + metric + period.
 *
 * Uses the composite index for efficient descending-value retrieval.
 * Post-filters by joining each entry's userId against profiles to check
 * leaderboardOptIn === true. Returns top `limit` (default 10) entries
 * with profile info (displayName, username).
 */
export const getLeaderboard = query({
  args: {
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    period: v.literal("allTime"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = args.limit ?? 10;

    // Fetch limit * 3 entries to account for non-opted-in users being filtered out
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_exerciseId_metric_period_value", (q) =>
        q
          .eq("exerciseId", args.exerciseId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .order("desc")
      .take(limit * 3);

    const totalEntries = entries.length;

    // Post-filter by opt-in and enrich with profile info
    const enriched: Array<{
      userId: string;
      value: number;
      displayName: string;
      username: string;
      updatedAt: number;
    }> = [];

    for (const entry of entries) {
      if (enriched.length >= limit) break;

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
        .first();

      if (profile && profile.leaderboardOptIn === true) {
        enriched.push({
          userId: entry.userId,
          value: entry.value,
          displayName: profile.displayName,
          username: profile.username,
          updatedAt: entry.updatedAt,
        });
      }
    }

    return { entries: enriched, totalEntries };
  },
});

// ── getMyRank ────────────────────────────────────────────────────────────────

/**
 * Current user's rank for a given exercise + metric + period.
 *
 * Scans up to 1000 entries (desc by value), filters to opted-in users,
 * finds the caller's position. Returns { rank, value, totalScanned } or
 * { rank: null } if not found or not opted in.
 */
export const getMyRank = query({
  args: {
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    period: v.literal("allTime"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check caller's opt-in status
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.leaderboardOptIn !== true) {
      return { rank: null as number | null, value: null as number | null, totalScanned: 0 };
    }

    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_exerciseId_metric_period_value", (q) =>
        q
          .eq("exerciseId", args.exerciseId)
          .eq("metric", args.metric)
          .eq("period", args.period),
      )
      .order("desc")
      .take(1000);

    const totalScanned = entries.length;

    // Filter to opted-in users and find caller's rank
    let rank = 0;
    for (const entry of entries) {
      const entryProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
        .first();

      if (entryProfile && entryProfile.leaderboardOptIn === true) {
        rank++;
        if (entry.userId === userId) {
          return { rank, value: entry.value, totalScanned };
        }
      }
    }

    // User has no entry for this exercise/metric/period
    return { rank: null as number | null, value: null as number | null, totalScanned };
  },
});

// ── setLeaderboardOptIn ──────────────────────────────────────────────────────

/**
 * Toggle leaderboard opt-in for the current user's profile.
 */
export const setLeaderboardOptIn = mutation({
  args: {
    optIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, { leaderboardOptIn: args.optIn });
  },
});

// ── getLeaderboardExercises ──────────────────────────────────────────────────

/**
 * List exercises that have at least one leaderboard entry.
 *
 * Scans up to 500 entries, deduplicates exerciseIds, fetches exercise docs,
 * and returns them sorted by name.
 */
export const getLeaderboardExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entries = await ctx.db
      .query("leaderboardEntries")
      .take(500);

    // Deduplicate exerciseIds
    const exerciseIdSet = new Set<string>();
    for (const entry of entries) {
      exerciseIdSet.add(entry.exerciseId as string);
    }

    // Fetch exercise docs
    const exercises: Array<{
      _id: string;
      name: string;
      primaryMuscleGroup: string;
    }> = [];

    for (const exerciseId of Array.from(exerciseIdSet)) {
      const exercise = await ctx.db.get(exerciseId as Id<"exercises">);
      if (exercise) {
        exercises.push({
          _id: exercise._id as string,
          name: exercise.name,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
        });
      }
    }

    // Sort by name
    exercises.sort((a, b) => a.name.localeCompare(b.name));

    return exercises;
  },
});
