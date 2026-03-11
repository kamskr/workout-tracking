import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── RPE validation ───────────────────────────────────────────────────────────

function validateRpe(rpe: number | undefined): void {
  if (rpe !== undefined && (rpe < 1 || rpe > 10)) {
    throw new Error("RPE must be between 1 and 10");
  }
}

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
    rpe: v.optional(v.number()),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    validateRpe(args.rpe);

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
      rpe: args.rpe,
      tempo: args.tempo,
      notes: args.notes,
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
    rpe: v.optional(v.number()),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    validateRpe(args.rpe);

    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");

    await verifySetOwnership(ctx, set.workoutExerciseId, userId, false);

    const patch: Record<string, unknown> = {};
    if (args.weight !== undefined) patch.weight = args.weight;
    if (args.reps !== undefined) patch.reps = args.reps;
    if (args.rpe !== undefined) patch.rpe = args.rpe;
    if (args.tempo !== undefined) patch.tempo = args.tempo;
    if (args.notes !== undefined) patch.notes = args.notes;
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
 * Get the previous performance for an exercise — the sets from the most recent
 * completed workout that included this exercise.
 * Returns { exerciseName, sets, workoutDate, workoutName } or null.
 */
export const getPreviousPerformance = query({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    // Get all workoutExercises that reference this exercise
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_exerciseId", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    if (workoutExercises.length === 0) return null;

    // For each, fetch the parent workout and filter for user's completed workouts
    const candidates: { workoutExercise: typeof workoutExercises[0]; workout: any }[] = [];

    for (const we of workoutExercises) {
      const workout = await ctx.db.get(we.workoutId);
      if (
        workout &&
        workout.userId === userId &&
        workout.status === "completed" &&
        workout.completedAt
      ) {
        candidates.push({ workoutExercise: we, workout });
      }
    }

    if (candidates.length === 0) return null;

    // Sort by completedAt desc, take the most recent
    candidates.sort((a, b) => b.workout.completedAt - a.workout.completedAt);
    const best = candidates[0]!;

    // Fetch sets for the winning workoutExercise
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q) =>
        q.eq("workoutExerciseId", best.workoutExercise._id),
      )
      .collect();

    sets.sort((a, b) => a.setNumber - b.setNumber);

    // Fetch exercise name for display convenience
    const exercise = await ctx.db.get(args.exerciseId);

    return {
      exerciseName: exercise?.name ?? "Unknown",
      sets: sets.map((s) => ({
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        tempo: s.tempo,
      })),
      workoutDate: best.workout.completedAt,
      workoutName: best.workout.name,
    };
  },
});

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
