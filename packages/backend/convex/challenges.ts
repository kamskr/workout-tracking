/**
 * Challenge system: internal lifecycle mutations + auth-gated public API.
 *
 * Internal mutations (T01): completeChallenge, activateChallenge, checkDeadlines
 * Public API (T02): createChallenge, joinChallenge, leaveChallenge, cancelChallenge,
 *                   getChallengeStandings, listChallenges, getChallenge
 *
 * State machine: pending → active → completed (or cancelled at any point)
 */

import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { challengeType, challengeStatus } from "./schema";
import { Doc, Id } from "./_generated/dataModel";

// ══════════════════════════════════════════════════════════════════════════════
// Internal mutations (T01 — lifecycle)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Complete an active challenge: determine winner and mark as completed.
 *
 * Idempotent — returns early if challenge is not in "active" status.
 * Winner is the participant with the highest currentValue.
 */
export const completeChallenge = internalMutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) {
      console.error(
        `[Challenge] completeChallenge(${args.challengeId}): challenge not found`,
      );
      return;
    }

    if (challenge.status !== "active") {
      console.log(
        `[Challenge] completeChallenge(${args.challengeId}): already ${challenge.status}, skipping`,
      );
      return;
    }

    // Query participants ordered by currentValue descending to find winner
    const topParticipant = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_currentValue", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .order("desc")
      .first();

    await ctx.db.patch(args.challengeId, {
      status: "completed",
      winnerId: topParticipant?.userId ?? undefined,
      completedAt: Date.now(),
    });

    console.log(
      `[Challenge] completeChallenge(${args.challengeId}): completed, winner=${topParticipant?.userId ?? "none"}`,
    );
  },
});

/**
 * Activate a pending challenge when its start time has arrived.
 *
 * Idempotent — returns early if challenge is not in "pending" status.
 */
export const activateChallenge = internalMutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) {
      console.error(
        `[Challenge] activateChallenge(${args.challengeId}): challenge not found`,
      );
      return;
    }

    if (challenge.status !== "pending") {
      console.log(
        `[Challenge] activateChallenge(${args.challengeId}): already ${challenge.status}, skipping`,
      );
      return;
    }

    await ctx.db.patch(args.challengeId, {
      status: "active",
    });

    console.log(
      `[Challenge] activateChallenge(${args.challengeId}): activated`,
    );
  },
});

/**
 * Cron-driven deadline check: processes both lifecycle transitions.
 *
 * 1. Active challenges past their endAt → completed
 * 2. Pending challenges past their startAt → active
 *
 * Runs inline (not via scheduler) since we're already in a mutation.
 */
export const checkDeadlines = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let completedCount = 0;
    let activatedCount = 0;

    // ── Complete active challenges past their end time ────────────────
    const activeChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const challenge of activeChallenges) {
      if (now >= challenge.endAt) {
        // Find winner: top participant by currentValue
        const topParticipant = await ctx.db
          .query("challengeParticipants")
          .withIndex("by_challengeId_currentValue", (q) =>
            q.eq("challengeId", challenge._id),
          )
          .order("desc")
          .first();

        await ctx.db.patch(challenge._id, {
          status: "completed",
          winnerId: topParticipant?.userId ?? undefined,
          completedAt: now,
        });

        completedCount++;
      }
    }

    // ── Activate pending challenges past their start time ────────────
    const pendingChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const challenge of pendingChallenges) {
      if (now >= challenge.startAt) {
        await ctx.db.patch(challenge._id, {
          status: "active",
        });

        activatedCount++;
      }
    }

    console.log(
      `[Challenge] checkDeadlines: completed ${completedCount} challenges, activated ${activatedCount} challenges`,
    );
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// Public API — auth-gated mutations & queries (T02)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new challenge. Creator auto-joins.
 *
 * Schedules completion at endAt and activation at startAt (if future).
 * If startAt <= now, challenge starts immediately as "active".
 */
export const createChallenge = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: challengeType,
    exerciseId: v.optional(v.id("exercises")),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate time bounds
    if (args.endAt <= Date.now()) {
      throw new Error("End time must be in the future");
    }
    if (args.startAt >= args.endAt) {
      throw new Error("Start time must be before end time");
    }

    // Exercise-specific types require exerciseId
    if (
      (args.type === "totalReps" ||
        args.type === "totalVolume" ||
        args.type === "maxWeight") &&
      !args.exerciseId
    ) {
      throw new Error(
        "Exercise-specific challenge types require an exerciseId",
      );
    }

    const now = Date.now();
    const startsImmediately = args.startAt <= now;

    // Insert the challenge
    const challengeId = await ctx.db.insert("challenges", {
      creatorId: userId,
      title: args.title,
      description: args.description,
      type: args.type,
      exerciseId: args.exerciseId,
      status: startsImmediately ? "active" : "pending",
      startAt: args.startAt,
      endAt: args.endAt,
      createdAt: now,
    });

    // Schedule completion at endAt
    const scheduledCompletionId = await ctx.scheduler.runAt(
      args.endAt,
      internal.challenges.completeChallenge,
      { challengeId },
    );

    // Store scheduled completion ID for cancellation support
    await ctx.db.patch(challengeId, { scheduledCompletionId });

    // If start is in the future, schedule activation
    if (!startsImmediately) {
      await ctx.scheduler.runAt(
        args.startAt,
        internal.challenges.activateChallenge,
        { challengeId },
      );
    }

    // Creator auto-joins
    await ctx.db.insert("challengeParticipants", {
      challengeId,
      userId,
      currentValue: 0,
      joinedAt: now,
    });

    return challengeId;
  },
});

/**
 * Join an existing challenge. Enforces:
 * - Challenge must be pending or active
 * - No duplicate joins (by_challengeId_userId index)
 * - Participant cap of 100 (D115)
 */
export const joinChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.status !== "pending" && challenge.status !== "active") {
      throw new Error("Challenge must be pending or active to join");
    }

    // Check for duplicate join
    const existing = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_userId", (q) =>
        q.eq("challengeId", args.challengeId).eq("userId", userId),
      )
      .first();

    if (existing) {
      throw new Error("Already joined");
    }

    // Check participant cap
    const participants = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_currentValue", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .collect();

    if (participants.length >= 100) {
      throw new Error("Participant cap reached (100)");
    }

    await ctx.db.insert("challengeParticipants", {
      challengeId: args.challengeId,
      userId,
      currentValue: 0,
      joinedAt: Date.now(),
    });
  },
});

/**
 * Leave a challenge. Creator cannot leave their own challenge.
 */
export const leaveChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.creatorId === userId) {
      throw new Error("Challenge creator cannot leave — cancel the challenge instead");
    }

    const participant = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_userId", (q) =>
        q.eq("challengeId", args.challengeId).eq("userId", userId),
      )
      .first();

    if (!participant) {
      throw new Error("Not a participant in this challenge");
    }

    await ctx.db.delete(participant._id);
  },
});

/**
 * Cancel a challenge. Only the creator can cancel.
 * Cancels any scheduled completion function.
 */
export const cancelChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.creatorId !== userId) {
      throw new Error("Only the challenge creator can cancel");
    }

    if (challenge.status !== "pending" && challenge.status !== "active") {
      throw new Error("Challenge must be pending or active to cancel");
    }

    await ctx.db.patch(args.challengeId, {
      status: "cancelled",
    });

    // Cancel scheduled completion if it exists
    if (challenge.scheduledCompletionId) {
      try {
        await ctx.scheduler.cancel(challenge.scheduledCompletionId);
      } catch {
        // Scheduled function may have already run — safe to ignore
      }
    }
  },
});

/**
 * Get challenge standings: challenge details + participants ordered by score.
 * Enriches participants with profile info (graceful fallback for missing profiles).
 */
export const getChallengeStandings = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    // Fetch participants ordered by currentValue descending
    const participants = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_currentValue", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .order("desc")
      .take(100);

    // Enrich with profile info
    const enriched = await Promise.all(
      participants.map(async (p) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .first();

        return {
          ...p,
          displayName: profile?.displayName ?? p.userId,
          username: profile?.username ?? p.userId,
        };
      }),
    );

    return { challenge, participants: enriched };
  },
});

/**
 * List challenges with optional filters.
 * - status: filter by challenge status
 * - myOnly: only challenges the current user participates in
 *
 * Returns up to 50 challenges ordered by createdAt descending,
 * each with a participant count.
 */
export const listChallenges = query({
  args: {
    status: v.optional(challengeStatus),
    myOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let challenges;

    if (args.myOnly) {
      // Get challenge IDs for this user's participations
      const participations = await ctx.db
        .query("challengeParticipants")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      const challengeIds: Id<"challenges">[] = participations.map((p) => p.challengeId);
      const seen = new Set<string>();
      const uniqueIds: Id<"challenges">[] = challengeIds.filter((id) => {
        const key = id as string;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Fetch each challenge
      const fetched = await Promise.all(
        uniqueIds.map((id) => ctx.db.get(id)),
      );
      const allChallenges: Doc<"challenges">[] = fetched.filter(
        (c): c is Doc<"challenges"> => c !== null,
      );

      // Apply status filter if provided
      const filtered = args.status
        ? allChallenges.filter((c) => c.status === args.status)
        : allChallenges;

      // Sort by createdAt descending
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      challenges = filtered.slice(0, 50);
    } else if (args.status) {
      challenges = await ctx.db
        .query("challenges")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(50);
    } else {
      challenges = await ctx.db
        .query("challenges")
        .order("desc")
        .take(50);
    }

    // Enrich with participant count (bounded sub-query)
    const enriched = await Promise.all(
      challenges.map(async (c) => {
        const participants = await ctx.db
          .query("challengeParticipants")
          .withIndex("by_challengeId_currentValue", (q) =>
            q.eq("challengeId", c._id),
          )
          .collect();

        return {
          ...c,
          participantCount: participants.length,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Get a single challenge with its participant count.
 */
export const getChallenge = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    const participants = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_currentValue", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .collect();

    return {
      ...challenge,
      participantCount: participants.length,
    };
  },
});
