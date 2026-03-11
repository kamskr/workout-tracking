/**
 * Sharing & privacy functions for workouts.
 *
 * Provides:
 * - shareWorkout: create a "workout_shared" feed item as a share token
 * - getSharedWorkout: public query (no auth) to view a shared workout
 * - cloneSharedWorkoutAsTemplate: clone a shared workout as a personal template
 * - toggleWorkoutPrivacy: flip isPublic on workout + cascade to feed items
 *
 * Stable error messages:
 * - "Workout not found"
 * - "Workout does not belong to user"
 * - "Workout is not completed"
 * - "Workout is private — cannot share"
 * - "Shared workout not available"
 *
 * Observability:
 * - [Share] Created workout_shared feed item {feedItemId} for workout {workoutId}
 * - [Privacy] Updated isPublic to {value} on workout {workoutId} and {count} feed items
 * - [Clone] User {userId} cloned shared workout {workoutId} as template {templateId}
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── shareWorkout ─────────────────────────────────────────────────────────────

/**
 * Create a "workout_shared" feed item for a public, completed workout.
 * Returns the feedItemId which acts as the share token.
 */
export const shareWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");
    if (workout.status !== "completed") throw new Error("Workout is not completed");
    if (workout.isPublic === false) throw new Error("Workout is private — cannot share");

    // After the guard above, isPublic is true | undefined — always public
    const isPublic = workout.isPublic ?? true;

    // Count exercises for summary
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();
    const exerciseCount = workoutExercises.length;

    // Count PRs
    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();
    const prCount = prs.length;

    const feedItemId = await ctx.db.insert("feedItems", {
      authorId: userId,
      type: "workout_shared",
      workoutId: args.workoutId,
      summary: {
        name: workout.name,
        durationSeconds: workout.durationSeconds ?? 0,
        exerciseCount,
        prCount,
      },
      isPublic,
      createdAt: Date.now(),
    });

    console.log(
      `[Share] Created workout_shared feed item ${feedItemId} for workout ${args.workoutId}`,
    );

    return feedItemId;
  },
});

// ── getSharedWorkout ─────────────────────────────────────────────────────────

/**
 * Public query — NO auth required.
 * Loads a shared workout by feedItemId, performing defense-in-depth checks:
 * 1. feedItem must exist and be public
 * 2. workout must exist and be public (isPublic !== false)
 * 3. If caller is authenticated, check blocks table
 *
 * Returns full workout detail or null.
 */
export const getSharedWorkout = query({
  args: {
    feedItemId: v.id("feedItems"),
  },
  handler: async (ctx, args) => {
    // Load feed item
    const feedItem = await ctx.db.get(args.feedItemId);
    if (!feedItem) return null;
    if (!feedItem.isPublic) return null;

    // Load workout — defense-in-depth
    const workout = await ctx.db.get(feedItem.workoutId);
    if (!workout) return null;
    if (workout.isPublic === false) return null;

    // Block check for authenticated callers
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const callerId = identity.subject;
      // Check if the author blocked the caller or vice versa
      const block1 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", feedItem.authorId).eq("blockedId", callerId),
        )
        .first();
      if (block1) return null;

      const block2 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", callerId).eq("blockedId", feedItem.authorId),
        )
        .first();
      if (block2) return null;
    }

    // Join workout → workoutExercises → exercises → sets
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
      .take(50);

    const exercises = await Promise.all(
      workoutExercises.map(async (we) => {
        const [exercise, sets] = await Promise.all([
          ctx.db.get(we.exerciseId),
          ctx.db
            .query("sets")
            .withIndex("by_workoutExerciseId", (q) =>
              q.eq("workoutExerciseId", we._id),
            )
            .take(20),
        ]);

        return {
          workoutExercise: we,
          exercise,
          sets,
        };
      }),
    );

    // Resolve author profile
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", feedItem.authorId))
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

    return {
      workout,
      exercises,
      author,
      feedItem,
    };
  },
});

// ── cloneSharedWorkoutAsTemplate ─────────────────────────────────────────────

/**
 * Clone a shared workout as a personal template.
 * Reuses the saveAsTemplate pattern: targetSets = sets.length, targetReps = first set's reps.
 */
export const cloneSharedWorkoutAsTemplate = mutation({
  args: {
    feedItemId: v.id("feedItems"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Load feed item
    const feedItem = await ctx.db.get(args.feedItemId);
    if (!feedItem || !feedItem.isPublic) {
      throw new Error("Shared workout not available");
    }

    // Load workout — defense-in-depth
    const workout = await ctx.db.get(feedItem.workoutId);
    if (!workout || workout.isPublic === false) {
      throw new Error("Shared workout not available");
    }

    // Block check
    const block1 = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", feedItem.authorId).eq("blockedId", userId),
      )
      .first();
    if (block1) throw new Error("Shared workout not available");

    const block2 = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", userId).eq("blockedId", feedItem.authorId),
      )
      .first();
    if (block2) throw new Error("Shared workout not available");

    // Read workout exercises + sets
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
      .collect();

    workoutExercises.sort((a, b) => a.order - b.order);

    // Create template owned by caller
    const templateId = await ctx.db.insert("workoutTemplates", {
      userId,
      name: args.name,
      createdFromWorkoutId: workout._id,
    });

    // Create template exercises from workout exercises
    for (const we of workoutExercises) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q) =>
          q.eq("workoutExerciseId", we._id),
        )
        .collect();

      sets.sort((a, b) => a.setNumber - b.setNumber);

      const targetSets = sets.length;
      const targetReps = sets.length > 0 ? sets[0]!.reps : undefined;

      await ctx.db.insert("templateExercises", {
        templateId,
        exerciseId: we.exerciseId,
        order: we.order,
        targetSets: targetSets > 0 ? targetSets : undefined,
        targetReps,
        restSeconds: we.restSeconds,
      });
    }

    console.log(
      `[Clone] User ${userId} cloned shared workout ${workout._id} as template ${templateId}`,
    );

    return templateId;
  },
});

// ── toggleWorkoutPrivacy ─────────────────────────────────────────────────────

/**
 * Toggle workout privacy. Cascades isPublic to all associated feed items.
 */
export const toggleWorkoutPrivacy = mutation({
  args: {
    workoutId: v.id("workouts"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");

    // Patch workout
    await ctx.db.patch(args.workoutId, { isPublic: args.isPublic });

    // Cascade to feed items
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    for (const fi of feedItems) {
      await ctx.db.patch(fi._id, { isPublic: args.isPublic });
    }

    console.log(
      `[Privacy] Updated isPublic to ${args.isPublic} on workout ${args.workoutId} and ${feedItems.length} feed items`,
    );
  },
});
