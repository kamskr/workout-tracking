import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Traverse from a workoutExercise to the workout and verify ownership + status.
 * Returns { workoutExercise, workout }.
 */
async function verifySetOwnership(
  ctx: { db: any },
  workoutExerciseId: any,
  userId: string,
  requireInProgress = true,
) {
  const workoutExercise = await ctx.db.get(workoutExerciseId);
  if (!workoutExercise) throw new Error("Workout exercise not found");

  const workout = await ctx.db.get(workoutExercise.workoutId);
  if (!workout) throw new Error("Workout not found");
  if (workout.userId !== userId) throw new Error("Workout does not belong to user");
  if (requireInProgress && workout.status !== "inProgress")
    throw new Error("Workout is not in progress");

  return { workoutExercise, workout };
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Log a new set for a workout exercise. Auto-computes setNumber (1-indexed).
 */
export const logSet = mutation({
  args: {
    workoutExerciseId: v.id("workoutExercises"),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await verifySetOwnership(ctx, args.workoutExerciseId, userId);

    const existingSets = await ctx.db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q) =>
        q.eq("workoutExerciseId", args.workoutExerciseId),
      )
      .collect();

    const setId = await ctx.db.insert("sets", {
      workoutExerciseId: args.workoutExerciseId,
      setNumber: existingSets.length + 1,
      weight: args.weight,
      reps: args.reps,
      isWarmup: args.isWarmup ?? false,
      completedAt: Date.now(),
    });

    return setId;
  },
});

/**
 * Update an existing set. Partial update — only provided fields are changed.
 */
export const updateSet = mutation({
  args: {
    setId: v.id("sets"),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");

    await verifySetOwnership(ctx, set.workoutExerciseId, userId, false);

    const patch: Record<string, unknown> = {};
    if (args.weight !== undefined) patch.weight = args.weight;
    if (args.reps !== undefined) patch.reps = args.reps;
    if (args.isWarmup !== undefined) patch.isWarmup = args.isWarmup;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.setId, patch);
    }
  },
});

/**
 * Delete a set.
 */
export const deleteSet = mutation({
  args: {
    setId: v.id("sets"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");

    await verifySetOwnership(ctx, set.workoutExerciseId, userId, false);

    await ctx.db.delete(args.setId);
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * List sets for a workout exercise, ordered by setNumber.
 */
export const listSetsForExercise = query({
  args: {
    workoutExerciseId: v.id("workoutExercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    await verifySetOwnership(ctx, args.workoutExerciseId, userId, false);

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q) =>
        q.eq("workoutExerciseId", args.workoutExerciseId),
      )
      .collect();

    // Sort by setNumber ascending
    sets.sort((a, b) => a.setNumber - b.setNumber);

    return sets;
  },
});
