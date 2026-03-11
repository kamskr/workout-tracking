import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new workout. Defaults to "inProgress" status and current timestamp.
 */
export const createWorkout = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: args.name ?? "Workout",
      status: "inProgress",
      startedAt: Date.now(),
    });

    return workoutId;
  },
});

/**
 * Finish an in-progress workout. Computes duration server-side.
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

    const completedAt = Date.now();
    const durationSeconds = Math.round((completedAt - workout.startedAt!) / 1000);

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt,
      durationSeconds,
    });

    return { completedAt, durationSeconds };
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
