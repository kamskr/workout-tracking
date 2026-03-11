/**
 * Test helpers for S02 verification.
 *
 * These functions accept a `testUserId` arg directly instead of using
 * Clerk auth, allowing the verification script to exercise the full
 * workout lifecycle via ConvexHttpClient without authentication tokens.
 *
 * They replicate the same logic as the auth-gated public functions
 * but substitute a hardcoded test userId.
 *
 * NOTE: In production, this file should be excluded from deployment
 * or gated behind an environment check. For local dev, these are
 * safe since they only operate on data owned by the test userId.
 */
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

// ── Workout helpers ──────────────────────────────────────────────────────────

export const testCreateWorkout = mutation({
  args: {
    testUserId: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.testUserId,
      name: args.name ?? "Workout",
      status: "inProgress",
      startedAt: Date.now(),
    });
    return workoutId;
  },
});

export const testFinishWorkout = mutation({
  args: {
    testUserId: v.string(),
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");
    if (workout.status !== "inProgress")
      throw new Error("Workout is not in progress");

    const completedAt = Date.now();
    const durationSeconds = Math.round(
      (completedAt - workout.startedAt!) / 1000,
    );

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt,
      durationSeconds,
    });

    return { completedAt, durationSeconds };
  },
});

export const testDeleteWorkout = mutation({
  args: {
    testUserId: v.string(),
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

    // Cascade: delete all workoutExercises and their sets
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
      .collect();

    for (const we of workoutExercises) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q) =>
          q.eq("workoutExerciseId", we._id),
        )
        .collect();

      for (const set of sets) {
        await ctx.db.delete(set._id);
      }

      await ctx.db.delete(we._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const testGetWorkoutWithDetails = query({
  args: {
    testUserId: v.string(),
    id: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.id);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

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
            .withIndex("by_workoutExerciseId", (q) =>
              q.eq("workoutExerciseId", we._id),
            )
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

export const testListWorkouts = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .order("desc")
      .take(50);
  },
});

// ── Workout Exercise helpers ─────────────────────────────────────────────────

export const testAddExercise = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");
    if (workout.status !== "inProgress")
      throw new Error("Workout is not in progress");

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

// ── Set helpers ──────────────────────────────────────────────────────────────

export const testLogSet = mutation({
  args: {
    testUserId: v.string(),
    workoutExerciseId: v.id("workoutExercises"),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");
    if (workout.status !== "inProgress")
      throw new Error("Workout is not in progress");

    // RPE validation
    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) {
      throw new Error("RPE must be between 1 and 10");
    }

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

// ── User Preference helpers ──────────────────────────────────────────────────

export const testSetUnitPreference = mutation({
  args: {
    testUserId: v.string(),
    unit: v.union(v.literal("kg"), v.literal("lbs")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { weightUnit: args.unit });
    } else {
      await ctx.db.insert("userPreferences", {
        userId: args.testUserId,
        weightUnit: args.unit,
      });
    }
  },
});

export const testGetPreferences = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    return prefs ?? { weightUnit: "kg" as const };
  },
});

export const testUpdateSet = mutation({
  args: {
    testUserId: v.string(),
    setId: v.id("sets"),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // RPE validation
    if (args.rpe !== undefined && (args.rpe < 1 || args.rpe > 10)) {
      throw new Error("RPE must be between 1 and 10");
    }

    const set = await ctx.db.get(args.setId);
    if (!set) throw new Error("Set not found");

    const workoutExercise = await ctx.db.get(set.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

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

// ── Superset helpers ─────────────────────────────────────────────────────────

export const testSetSupersetGroup = mutation({
  args: {
    testUserId: v.string(),
    workoutExerciseIds: v.array(v.id("workoutExercises")),
    supersetGroupId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const weId of args.workoutExerciseIds) {
      const workoutExercise = await ctx.db.get(weId);
      if (!workoutExercise) throw new Error("Workout exercise not found");

      const workout = await ctx.db.get(workoutExercise.workoutId);
      if (!workout) throw new Error("Workout not found");
      if (workout.userId !== args.testUserId)
        throw new Error("Workout does not belong to user");

      await ctx.db.patch(weId, { supersetGroupId: args.supersetGroupId });
    }
  },
});

export const testClearSupersetGroup = mutation({
  args: {
    testUserId: v.string(),
    workoutExerciseId: v.id("workoutExercises"),
  },
  handler: async (ctx, args) => {
    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) throw new Error("Workout exercise not found");

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

    await ctx.db.patch(args.workoutExerciseId, {
      supersetGroupId: undefined,
    });
  },
});

// ── Previous Performance helper ──────────────────────────────────────────────

export const testGetPreviousPerformance = query({
  args: {
    testUserId: v.string(),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    // Get all workoutExercises that reference this exercise
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_exerciseId", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    if (workoutExercises.length === 0) return null;

    // For each, fetch the parent workout and filter for user's completed workouts
    const candidates: {
      workoutExercise: (typeof workoutExercises)[0];
      workout: any;
    }[] = [];

    for (const we of workoutExercises) {
      const workout = await ctx.db.get(we.workoutId);
      if (
        workout &&
        workout.userId === args.testUserId &&
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

// ── Cleanup helper ───────────────────────────────────────────────────────────

/**
 * Delete all test data for a given testUserId.
 * Cleans up workouts (cascade), and user preferences.
 */
export const testCleanup = mutation({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete all workouts (with cascade)
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const workout of workouts) {
      const workoutExercises = await ctx.db
        .query("workoutExercises")
        .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
        .collect();

      for (const we of workoutExercises) {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_workoutExerciseId", (q) =>
            q.eq("workoutExerciseId", we._id),
          )
          .collect();

        for (const set of sets) {
          await ctx.db.delete(set._id);
        }

        await ctx.db.delete(we._id);
      }

      await ctx.db.delete(workout._id);
    }

    // Delete user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const pref of prefs) {
      await ctx.db.delete(pref._id);
    }
  },
});
