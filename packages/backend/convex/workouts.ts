import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { finishWorkoutCore } from "./lib/finishWorkoutCore";

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new workout. Defaults to "inProgress" status and current timestamp.
 */
export const createWorkout = mutation({
  args: {
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: args.name ?? "Workout",
      status: "inProgress",
      isPublic: args.isPublic,
      startedAt: Date.now(),
    });

    return workoutId;
  },
});

/**
 * Finish an in-progress workout. Computes duration server-side.
 *
 * Auth + ownership checks here; all hook logic delegates to finishWorkoutCore.
 */
export const finishWorkout = mutation({
  args: {
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");
    if (workout.status !== "inProgress") throw new Error("Workout is not in progress");

    return await finishWorkoutCore(ctx.db, userId, args.id);
  },
});

/**
 * Delete a workout and cascade delete all its workoutExercises and sets.
 */
export const deleteWorkout = mutation({
  args: {
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");

    // Cascade: delete all workoutExercises and their sets
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
      .collect();

    for (const we of workoutExercises) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q) => q.eq("workoutExerciseId", we._id))
        .collect();

      for (const set of sets) {
        await ctx.db.delete(set._id);
      }

      await ctx.db.delete(we._id);
    }

    // Cascade: delete associated feed items and their reactions
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
      .collect();

    for (const feedItem of feedItems) {
      // Delete reactions for this feed item
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_feedItemId", (q) => q.eq("feedItemId", feedItem._id))
        .collect();

      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }

      await ctx.db.delete(feedItem._id);
    }

    // Cascade: delete leaderboard entries for this workout
    const leaderboardEntries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_userId", (q) => q.eq("userId", workout.userId))
      .collect();

    for (const entry of leaderboardEntries) {
      if (entry.workoutId === args.id) {
        await ctx.db.delete(entry._id);
      }
    }

    await ctx.db.delete(args.id);
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get the current user's active (inProgress) workout, or null.
 */
export const getActiveWorkout = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "inProgress"))
      .first();

    return workout ?? null;
  },
});

/**
 * Get a single workout by ID. Verifies ownership.
 */
export const getWorkout = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");

    return workout;
  },
});

/**
 * Get a workout with all its exercises and sets joined.
 * Returns { workout, exercises: [{ workoutExercise, exercise, sets }] }.
 */
export const getWorkoutWithDetails = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");

    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
      .collect();

    const exercises = await Promise.all(
      workoutExercises.map(async (we) => {
        const [exercise, sets] = await Promise.all([
          ctx.db.get(we.exerciseId),
          ctx.db
            .query("sets")
            .withIndex("by_workoutExerciseId", (q) => q.eq("workoutExerciseId", we._id))
            .collect(),
        ]);

        return {
          workoutExercise: we,
          exercise,
          sets,
        };
      }),
    );

    return { workout, exercises };
  },
});

/**
 * List the current user's workouts, newest first, up to 50.
 */
export const listWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await ctx.db
      .query("workouts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});
