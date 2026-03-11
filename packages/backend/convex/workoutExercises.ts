import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Helper ───────────────────────────────────────────────────────────────────

/**
 * Verify that the workout exists, belongs to the user, and is in progress.
 * Throws descriptive errors on failure.
 */
async function verifyWorkoutOwnershipAndStatus(
  ctx: { db: any },
  workoutId: any,
  userId: string,
  requireInProgress = true,
) {
  const workout = await ctx.db.get(workoutId);
  if (!workout) throw new Error("Workout not found");
  if (workout.userId !== userId) throw new Error("Workout does not belong to user");
  if (requireInProgress && workout.status !== "inProgress")
    throw new Error("Workout is not in progress");
  return workout;
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Add an exercise to an in-progress workout.
 * Order is auto-computed as the next index.
 */
export const addExerciseToWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await verifyWorkoutOwnershipAndStatus(ctx, args.workoutId, userId);

    const existingExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    const workoutExerciseId = await ctx.db.insert("workoutExercises", {
      workoutId: args.workoutId,
      exerciseId: args.exerciseId,
      order: existingExercises.length,
    });

    return workoutExerciseId;
  },
});

/**
 * Remove an exercise from a workout. Cascade deletes all its sets.
 */
export const removeExerciseFromWorkout = mutation({
  args: {
    workoutExerciseId: v.id("workoutExercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    await verifyWorkoutOwnershipAndStatus(ctx, workoutExercise.workoutId, userId);

    // Cascade delete sets
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q) =>
        q.eq("workoutExerciseId", args.workoutExerciseId),
      )
      .collect();

    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    await ctx.db.delete(args.workoutExerciseId);
  },
});

/**
 * Reorder exercises within a workout.
 * `orderedIds` is the full list of workoutExercise IDs in desired order.
 */
export const reorderExercises = mutation({
  args: {
    workoutId: v.id("workouts"),
    orderedIds: v.array(v.id("workoutExercises")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await verifyWorkoutOwnershipAndStatus(ctx, args.workoutId, userId);

    await Promise.all(
      args.orderedIds.map((id, index) => ctx.db.patch(id, { order: index })),
    );
  },
});

/**
 * Set a superset group ID on multiple workout exercises.
 * All exercises must belong to the same workout owned by the user.
 */
export const setSupersetGroup = mutation({
  args: {
    workoutExerciseIds: v.array(v.id("workoutExercises")),
    supersetGroupId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    for (const weId of args.workoutExerciseIds) {
      const workoutExercise = await ctx.db.get(weId);
      if (!workoutExercise) throw new Error("Workout exercise not found");

      const workout = await ctx.db.get(workoutExercise.workoutId);
      if (!workout) throw new Error("Workout not found");
      if (workout.userId !== userId)
        throw new Error("Workout does not belong to user");

      await ctx.db.patch(weId, { supersetGroupId: args.supersetGroupId });
    }
  },
});

/**
 * Clear the superset group ID from a single workout exercise.
 */
export const clearSupersetGroup = mutation({
  args: {
    workoutExerciseId: v.id("workoutExercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId)
      throw new Error("Workout does not belong to user");

    await ctx.db.patch(args.workoutExerciseId, { supersetGroupId: undefined });
  },
});

/**
 * Update the rest seconds override on a workout exercise.
 * Pass `restSeconds` as a number to set, or undefined to clear.
 */
export const updateRestSeconds = mutation({
  args: {
    workoutExerciseId: v.id("workoutExercises"),
    restSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    await verifyWorkoutOwnershipAndStatus(ctx, workoutExercise.workoutId, userId);

    await ctx.db.patch(args.workoutExerciseId, {
      restSeconds: args.restSeconds,
    });
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * List exercises for a workout, joined with exercise data, ordered by `order`.
 */
export const listExercisesForWorkout = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await verifyWorkoutOwnershipAndStatus(ctx, args.workoutId, userId, false);

    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    // Sort by order field
    workoutExercises.sort((a, b) => a.order - b.order);

    const result = await Promise.all(
      workoutExercises.map(async (we) => {
        const exercise = await ctx.db.get(we.exerciseId);
        return { workoutExercise: we, exercise };
      }),
    );

    return result;
  },
});
