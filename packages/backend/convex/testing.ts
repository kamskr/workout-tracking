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
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { detectAndStorePRs, type PRDetectionResult } from "./lib/prDetection";
import {
  computeExerciseProgress,
  computeVolumeByMuscleGroup,
  computePeriodSummary,
} from "./analytics";
import { computeCurrentStreak } from "./profiles";
import { reactionType, reportTargetType } from "./schema";
import { paginationOptsValidator } from "convex/server";
import { updateLeaderboardEntries } from "./lib/leaderboardCompute";
import { leaderboardMetric, challengeType, challengeStatus } from "./schema";
import { updateChallengeProgress } from "./lib/challengeCompute";

// ── Workout helpers ──────────────────────────────────────────────────────────

export const testCreateWorkout = mutation({
  args: {
    testUserId: v.string(),
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.testUserId,
      name: args.name ?? "Workout",
      status: "inProgress",
      isPublic: args.isPublic,
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

    // Create feed item (non-fatal — mirrors production finishWorkout)
    try {
      const workoutExercises = await ctx.db
        .query("workoutExercises")
        .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
        .collect();
      const exerciseCount = workoutExercises.length;

      const prs = await ctx.db
        .query("personalRecords")
        .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
        .collect();
      const prCount = prs.length;

      await ctx.db.insert("feedItems", {
        authorId: args.testUserId,
        type: "workout_completed",
        workoutId: args.id,
        summary: {
          name: workout.name,
          durationSeconds,
          exerciseCount,
          prCount,
        },
        isPublic: workout.isPublic ?? true,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error(
        `[Feed Item] Error creating feed item for workout ${args.id}: ${err}`,
      );
    }

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

    // Cascade: delete associated feed items and their reactions
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.id))
      .collect();

    for (const feedItem of feedItems) {
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
    const lbEntries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const entry of lbEntries) {
      if (entry.workoutId === args.id) {
        await ctx.db.delete(entry._id);
      }
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

/**
 * Shared handler logic for testLogSet and testLogSetWithPR.
 * Returns { setId, prs } — callers decide which fields to expose.
 */
async function _testLogSetCore(
  ctx: { db: any },
  args: {
    testUserId: string;
    workoutExerciseId: any;
    weight?: number;
    reps?: number;
    rpe?: number;
    tempo?: string;
    notes?: string;
    isWarmup?: boolean;
  },
): Promise<{ setId: any; prs: PRDetectionResult }> {
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

  const isWarmup = args.isWarmup ?? false;

  const existingSets = await ctx.db
    .query("sets")
    .withIndex("by_workoutExerciseId", (q: any) =>
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
    isWarmup,
    completedAt: Date.now(),
  });

  // PR Detection (non-fatal)
  let prs: PRDetectionResult = {};
  try {
    prs = await detectAndStorePRs(
      ctx.db,
      args.testUserId,
      workoutExercise.exerciseId,
      workoutExercise.workoutId,
      setId,
      { weight: args.weight, reps: args.reps, isWarmup },
      existingSets.map((s: any) => ({
        weight: s.weight,
        reps: s.reps,
        isWarmup: s.isWarmup,
      })),
    );
  } catch (err) {
    console.error("[Test PR Detection] Error:", err);
  }

  return { setId, prs };
}

const testLogSetArgs = {
  testUserId: v.string(),
  workoutExerciseId: v.id("workoutExercises"),
  weight: v.optional(v.number()),
  reps: v.optional(v.number()),
  rpe: v.optional(v.number()),
  tempo: v.optional(v.string()),
  notes: v.optional(v.string()),
  isWarmup: v.optional(v.boolean()),
};

/**
 * Log a set with PR detection. Returns just the setId for backward compatibility.
 * Existing verify scripts (S02–S05) depend on this returning a bare Id.
 */
export const testLogSet = mutation({
  args: testLogSetArgs,
  handler: async (ctx, args) => {
    const { setId } = await _testLogSetCore(ctx, args);
    return setId;
  },
});

/**
 * Log a set with PR detection. Returns { setId, prs } for PR-specific verification.
 */
export const testLogSetWithPR = mutation({
  args: testLogSetArgs,
  handler: async (ctx, args) => {
    return await _testLogSetCore(ctx, args);
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

// ── Rest Timer helpers ───────────────────────────────────────────────────────

export const testUpdateRestSeconds = mutation({
  args: {
    testUserId: v.string(),
    workoutExerciseId: v.id("workoutExercises"),
    restSeconds: v.optional(v.number()),
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

    await ctx.db.patch(args.workoutExerciseId, {
      restSeconds: args.restSeconds,
    });
  },
});

export const testSetDefaultRestSeconds = mutation({
  args: {
    testUserId: v.string(),
    defaultRestSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { defaultRestSeconds: args.defaultRestSeconds });
    } else {
      await ctx.db.insert("userPreferences", {
        userId: args.testUserId,
        weightUnit: "kg",
        defaultRestSeconds: args.defaultRestSeconds,
      });
    }
  },
});

// ── Template helpers ──────────────────────────────────────────────────────────

export const testSaveAsTemplate = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");
    if (workout.status !== "completed")
      throw new Error("Workout is not completed");

    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    if (workoutExercises.length === 0) {
      throw new Error("Workout has no exercises — cannot save as template");
    }

    const templateId = await ctx.db.insert("workoutTemplates", {
      userId: args.testUserId,
      name: args.name,
      description: args.description,
      createdFromWorkoutId: args.workoutId,
    });

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

    return templateId;
  },
});

export const testListTemplates = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .order("desc")
      .collect();
  },
});

export const testGetTemplateWithExercises = query({
  args: {
    testUserId: v.string(),
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== args.testUserId)
      throw new Error("Template does not belong to user");

    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.templateId))
      .collect();

    templateExercises.sort((a, b) => a.order - b.order);

    const exercises = await Promise.all(
      templateExercises.map(async (te) => {
        const exercise = await ctx.db.get(te.exerciseId);
        return {
          templateExercise: te,
          exercise,
        };
      }),
    );

    return { template, exercises };
  },
});

export const testDeleteTemplate = mutation({
  args: {
    testUserId: v.string(),
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== args.testUserId)
      throw new Error("Template does not belong to user");

    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.templateId))
      .collect();

    for (const te of templateExercises) {
      await ctx.db.delete(te._id);
    }

    await ctx.db.delete(args.templateId);
  },
});

export const testStartFromTemplate = mutation({
  args: {
    testUserId: v.string(),
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    // Check for active workout
    const activeWorkout = await ctx.db
      .query("workouts")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.testUserId).eq("status", "inProgress"),
      )
      .first();

    if (activeWorkout) {
      throw new Error(
        "Cannot start from template: you already have an active workout",
      );
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== args.testUserId)
      throw new Error("Template does not belong to user");

    const workoutId = await ctx.db.insert("workouts", {
      userId: args.testUserId,
      name: template.name,
      status: "inProgress",
      startedAt: Date.now(),
    });

    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.templateId))
      .collect();

    templateExercises.sort((a, b) => a.order - b.order);

    for (const te of templateExercises) {
      await ctx.db.insert("workoutExercises", {
        workoutId,
        exerciseId: te.exerciseId,
        order: te.order,
        restSeconds: te.restSeconds,
      });
    }

    return workoutId;
  },
});

// ── Personal Records helpers ─────────────────────────────────────────────

export const testGetWorkoutPRs = query({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    // Join exercise names
    const results = await Promise.all(
      prs.map(async (pr) => {
        const exercise = await ctx.db.get(pr.exerciseId);
        return {
          ...pr,
          exerciseName: exercise?.name ?? "Unknown",
        };
      }),
    );

    return results;
  },
});

export const testGetPersonalRecords = query({
  args: {
    testUserId: v.string(),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_userId_exerciseId", (q) =>
        q.eq("userId", args.testUserId).eq("exerciseId", args.exerciseId),
      )
      .collect();

    return prs;
  },
});

// ── Profile helpers ──────────────────────────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Test version of createProfile — accepts testUserId instead of auth.
 * Same logic: at-most-one-per-user, username format + uniqueness checks.
 */
export const testCreateProfile = mutation({
  args: {
    testUserId: v.string(),
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already has a profile
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (existing) {
      return existing;
    }

    // Validate username format
    if (!USERNAME_REGEX.test(args.username)) {
      throw new Error(
        "Username must be 3-30 characters, alphanumeric and underscores only",
      );
    }

    // Check case-insensitive uniqueness
    const usernameLower = args.username.toLowerCase();
    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) =>
        q.eq("usernameLower", usernameLower),
      )
      .first();

    if (taken) {
      throw new Error("Username already taken");
    }

    // Insert profile
    const profileId = await ctx.db.insert("profiles", {
      userId: args.testUserId,
      username: args.username,
      usernameLower,
      displayName: args.displayName,
      bio: args.bio,
      isPublic: true,
      createdAt: Date.now(),
    });

    return await ctx.db.get(profileId);
  },
});

/**
 * Test version of updateProfile — accepts testUserId instead of auth.
 * Username is immutable. Cleans up old avatar storage on change.
 */
export const testUpdateProfile = mutation({
  args: {
    testUserId: v.string(),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.isPublic !== undefined) patch.isPublic = args.isPublic;

    if (args.avatarStorageId !== undefined) {
      if (
        profile.avatarStorageId &&
        profile.avatarStorageId !== args.avatarStorageId
      ) {
        try {
          await ctx.storage.delete(profile.avatarStorageId);
        } catch (err) {
          console.error("[testUpdateProfile] Failed to delete old avatar:", err);
        }
      }
      patch.avatarStorageId = args.avatarStorageId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(profile._id, patch);
    }

    return await ctx.db.get(profile._id);
  },
});

/**
 * Test version of getProfile — returns profile for given testUserId (no auth check).
 */
export const testGetProfile = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (!profile) return null;

    let avatarUrl: string | null = null;
    if (profile.avatarStorageId) {
      avatarUrl = (await ctx.storage.getUrl(profile.avatarStorageId)) ?? null;
    }

    return { ...profile, avatarUrl };
  },
});

/**
 * Test version of getProfileByUsername — returns profile by username (no auth check).
 */
export const testGetProfileByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const usernameLower = args.username.toLowerCase();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_usernameLower", (q) =>
        q.eq("usernameLower", usernameLower),
      )
      .first();

    if (!profile) return null;

    let avatarUrl: string | null = null;
    if (profile.avatarStorageId) {
      avatarUrl = (await ctx.storage.getUrl(profile.avatarStorageId)) ?? null;
    }

    return { ...profile, avatarUrl };
  },
});

/**
 * Test version of getProfileStats — returns stats for given testUserId (no auth check).
 */
export const testGetProfileStats = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Mirrors production getProfileStats: includePrivate = false for public-facing stats
    const summary = await computePeriodSummary(
      ctx.db,
      args.testUserId,
      undefined,
      false,
    );
    const currentStreak = await computeCurrentStreak(ctx.db, args.testUserId);

    return {
      totalWorkouts: summary.workoutCount,
      currentStreak,
      totalVolume: summary.totalVolume,
      topExercises: summary.topExercises,
    };
  },
});

/**
 * Test version of searchProfiles — searches displayName (no auth check).
 */
export const testSearchProfiles = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("profiles")
      .withSearchIndex("search_displayName", (q) =>
        q.search("displayName", args.searchTerm),
      )
      .take(20);

    return results;
  },
});

// ── Social test helpers ───────────────────────────────────────────────────────

/**
 * Test version of followUser — accepts testUserId instead of auth.
 * Idempotent, rejects self-follow.
 */
export const testFollowUser = mutation({
  args: {
    testUserId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.testUserId === args.followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", args.testUserId).eq("followingId", args.followingId),
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("follows", {
      followerId: args.testUserId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Test version of unfollowUser — accepts testUserId instead of auth.
 */
export const testUnfollowUser = mutation({
  args: {
    testUserId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", args.testUserId).eq("followingId", args.followingId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Test version of getFollowStatus — accepts testUserId instead of auth.
 */
export const testGetFollowStatus = query({
  args: {
    testUserId: v.string(),
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", args.testUserId).eq("followingId", args.targetUserId),
        )
        .first(),
      ctx.db
        .query("follows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", args.targetUserId).eq("followingId", args.testUserId),
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
 * Test version of getFollowCounts — accepts testUserId arg.
 */
export const testGetFollowCounts = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const [followers, following] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_followingId", (q) => q.eq("followingId", args.testUserId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_followerId", (q) => q.eq("followerId", args.testUserId))
        .collect(),
    ]);

    return {
      followers: followers.length,
      following: following.length,
    };
  },
});

/**
 * Test version of getFeed — accepts testUserId, uses paginationOpts.
 */
export const testGetFeed = query({
  args: {
    testUserId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // 1. Get follow list
    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", args.testUserId))
      .collect();
    const followedIds = new Set(followRows.map((f) => f.followingId));

    // 2. Get block list
    const blockRows = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId", (q) => q.eq("blockerId", args.testUserId))
      .collect();
    const blockedIds = new Set(blockRows.map((b) => b.blockedId));

    // 3. Paginate feedItems by createdAt desc
    const paginatedResult = await ctx.db
      .query("feedItems")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);

    // 4. Post-filter
    const filteredItems = paginatedResult.page.filter(
      (item) =>
        followedIds.has(item.authorId) &&
        !blockedIds.has(item.authorId) &&
        item.isPublic,
    );

    // 5. Resolve author profiles and reaction summaries
    const enrichedItems = await Promise.all(
      filteredItems.map(async (item) => {
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
          if (r.userId === args.testUserId) entry.userHasReacted = true;
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

/**
 * Test helper to directly create a feed item (for bulk insertion in pagination tests).
 * Accepts optional type and isPublic for sharing/privacy tests.
 */
export const testCreateFeedItem = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
    summary: v.object({
      name: v.string(),
      durationSeconds: v.number(),
      exerciseCount: v.number(),
      prCount: v.number(),
    }),
    type: v.optional(v.union(v.literal("workout_completed"), v.literal("workout_shared"))),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedItems", {
      authorId: args.testUserId,
      type: args.type ?? "workout_completed",
      workoutId: args.workoutId,
      summary: args.summary,
      isPublic: args.isPublic ?? true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Test version of addReaction — accepts testUserId instead of auth.
 * Idempotent, enforces unique constraint.
 */
export const testAddReaction = mutation({
  args: {
    testUserId: v.string(),
    feedItemId: v.id("feedItems"),
    type: reactionType,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId_userId_type", (q) =>
        q
          .eq("feedItemId", args.feedItemId)
          .eq("userId", args.testUserId)
          .eq("type", args.type),
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("reactions", {
      feedItemId: args.feedItemId,
      userId: args.testUserId,
      type: args.type,
      createdAt: Date.now(),
    });
  },
});

/**
 * Test version of removeReaction — accepts testUserId instead of auth.
 */
export const testRemoveReaction = mutation({
  args: {
    testUserId: v.string(),
    feedItemId: v.id("feedItems"),
    type: reactionType,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_feedItemId_userId_type", (q) =>
        q
          .eq("feedItemId", args.feedItemId)
          .eq("userId", args.testUserId)
          .eq("type", args.type),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Test version of getReactionsForFeedItem — accepts testUserId for user-specific flag.
 */
export const testGetReactionsForFeedItem = query({
  args: {
    testUserId: v.string(),
    feedItemId: v.id("feedItems"),
  },
  handler: async (ctx, args) => {
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
      if (r.userId === args.testUserId) entry.userHasReacted = true;
      reactionCounts.set(r.type, entry);
    }

    return Array.from(reactionCounts.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      userHasReacted: data.userHasReacted,
    }));
  },
});

/**
 * Test version of blockUser — accepts testUserId instead of auth.
 * Idempotent, cascade-removes follow relationships.
 */
export const testBlockUser = mutation({
  args: {
    testUserId: v.string(),
    blockedId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.testUserId === args.blockedId) {
      throw new Error("Cannot block yourself");
    }

    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.testUserId).eq("blockedId", args.blockedId),
      )
      .first();

    if (existing) return existing._id;

    const blockId = await ctx.db.insert("blocks", {
      blockerId: args.testUserId,
      blockedId: args.blockedId,
      createdAt: Date.now(),
    });

    // Cascade-remove follow relationships in both directions
    let removedCount = 0;

    const follow1 = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", args.testUserId).eq("followingId", args.blockedId),
      )
      .first();
    if (follow1) {
      await ctx.db.delete(follow1._id);
      removedCount++;
    }

    const follow2 = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", args.blockedId).eq("followingId", args.testUserId),
      )
      .first();
    if (follow2) {
      await ctx.db.delete(follow2._id);
      removedCount++;
    }

    if (removedCount > 0) {
      console.log(
        `[Block] Removed ${removedCount} follow relationships between ${args.testUserId} and ${args.blockedId}`,
      );
    }

    return blockId;
  },
});

/**
 * Test version of unblockUser — accepts testUserId instead of auth.
 */
export const testUnblockUser = mutation({
  args: {
    testUserId: v.string(),
    blockedId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.testUserId).eq("blockedId", args.blockedId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Test version of reportContent — accepts testUserId instead of auth.
 */
export const testReportContent = mutation({
  args: {
    testUserId: v.string(),
    targetType: reportTargetType,
    targetId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reports", {
      reporterId: args.testUserId,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

// ── Sharing & Privacy test helpers ────────────────────────────────────────────

/**
 * testCreateWorkoutWithPrivacy — createWorkout variant accepting isPublic arg.
 * Alias for testCreateWorkout which already accepts isPublic.
 */
export const testCreateWorkoutWithPrivacy = mutation({
  args: {
    testUserId: v.string(),
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workoutId = await ctx.db.insert("workouts", {
      userId: args.testUserId,
      name: args.name ?? "Workout",
      status: "inProgress",
      isPublic: args.isPublic,
      startedAt: Date.now(),
    });
    return workoutId;
  },
});

/**
 * testShareWorkout — mirrors shareWorkout mutation (no auth check).
 */
export const testShareWorkout = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");
    if (workout.status !== "completed")
      throw new Error("Workout is not completed");
    if (workout.isPublic === false)
      throw new Error("Workout is private — cannot share");

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
      authorId: args.testUserId,
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

/**
 * testGetSharedWorkout — mirrors getSharedWorkout query (no auth check).
 * Skips block checks since test helpers don't have auth context.
 */
export const testGetSharedWorkout = query({
  args: {
    feedItemId: v.id("feedItems"),
    testCallerId: v.optional(v.string()),
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

    // Block check if caller provided
    if (args.testCallerId) {
      const block1 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", feedItem.authorId).eq("blockedId", args.testCallerId!),
        )
        .first();
      if (block1) return null;

      const block2 = await ctx.db
        .query("blocks")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", args.testCallerId!).eq("blockedId", feedItem.authorId),
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
      workoutExercises.map(async (we: any) => {
        const [exercise, sets] = await Promise.all([
          ctx.db.get(we.exerciseId),
          ctx.db
            .query("sets")
            .withIndex("by_workoutExerciseId", (q: any) =>
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

/**
 * testCloneAsTemplate — mirrors cloneSharedWorkoutAsTemplate (no auth check).
 */
export const testCloneAsTemplate = mutation({
  args: {
    testUserId: v.string(),
    feedItemId: v.id("feedItems"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
        q.eq("blockerId", feedItem.authorId).eq("blockedId", args.testUserId),
      )
      .first();
    if (block1) throw new Error("Shared workout not available");

    const block2 = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.testUserId).eq("blockedId", feedItem.authorId),
      )
      .first();
    if (block2) throw new Error("Shared workout not available");

    // Read workout exercises + sets
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
      .collect();

    workoutExercises.sort((a: any, b: any) => a.order - b.order);

    // Create template owned by caller
    const templateId = await ctx.db.insert("workoutTemplates", {
      userId: args.testUserId,
      name: args.name,
      createdFromWorkoutId: workout._id,
    });

    // Create template exercises from workout exercises
    for (const we of workoutExercises) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q: any) =>
          q.eq("workoutExerciseId", we._id),
        )
        .collect();

      sets.sort((a: any, b: any) => a.setNumber - b.setNumber);

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
      `[Clone] User ${args.testUserId} cloned shared workout ${workout._id} as template ${templateId}`,
    );

    return templateId;
  },
});

/**
 * testToggleWorkoutPrivacy — mirrors toggleWorkoutPrivacy mutation (no auth check).
 */
export const testToggleWorkoutPrivacy = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

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

// ── Cleanup helper ───────────────────────────────────────────────────────────

/**
 * Delete all test data for a given testUserId.
 * Cleans up templates (cascade), workouts (cascade), and user preferences.
 */
export const testCleanup = mutation({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete all templates (with cascade)
    const templates = await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const template of templates) {
      const templateExercises = await ctx.db
        .query("templateExercises")
        .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
        .collect();

      for (const te of templateExercises) {
        await ctx.db.delete(te._id);
      }

      await ctx.db.delete(template._id);
    }

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

    // Delete personal records — sweep by workoutId for each workout
    for (const workout of workouts) {
      const prsByWorkout = await ctx.db
        .query("personalRecords")
        .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
        .collect();

      for (const pr of prsByWorkout) {
        await ctx.db.delete(pr._id);
      }
    }

    // Also sweep personal records by userId+exerciseId (catches orphans)
    // We need to query all exercises to sweep, but a simpler approach:
    // query all personalRecords that match any workout we deleted above
    // might miss records if the workout was already deleted. Use a full table
    // scan filtered by userId as a safety net.
    const allPrs = await ctx.db
      .query("personalRecords")
      .withIndex("by_userId_exerciseId", (q) =>
        q.eq("userId", args.testUserId),
      )
      .collect();

    for (const pr of allPrs) {
      // May already be deleted from the workoutId sweep — use try/catch
      try {
        await ctx.db.delete(pr._id);
      } catch {
        // Already deleted in the workoutId sweep
      }
    }

    // Delete leaderboard entries
    const leaderboardEntries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const entry of leaderboardEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const pref of prefs) {
      await ctx.db.delete(pref._id);
    }

    // Delete social data: follows (both directions)
    const followsAsFollower = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", args.testUserId))
      .collect();
    for (const f of followsAsFollower) {
      await ctx.db.delete(f._id);
    }

    const followsAsFollowing = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.testUserId))
      .collect();
    for (const f of followsAsFollowing) {
      await ctx.db.delete(f._id);
    }

    // Delete feed items authored by user (and their reactions)
    const feedItems = await ctx.db
      .query("feedItems")
      .withIndex("by_authorId_createdAt", (q) => q.eq("authorId", args.testUserId))
      .collect();
    for (const fi of feedItems) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_feedItemId", (q) => q.eq("feedItemId", fi._id))
        .collect();
      for (const r of reactions) {
        await ctx.db.delete(r._id);
      }
      await ctx.db.delete(fi._id);
    }

    // Delete blocks (both directions)
    const blocksAsBlocker = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId", (q) => q.eq("blockerId", args.testUserId))
      .collect();
    for (const b of blocksAsBlocker) {
      await ctx.db.delete(b._id);
    }

    const blocksAsBlocked = await ctx.db
      .query("blocks")
      .withIndex("by_blockedId", (q) => q.eq("blockedId", args.testUserId))
      .collect();
    for (const b of blocksAsBlocked) {
      await ctx.db.delete(b._id);
    }

    // Delete reports by user
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_reporterId", (q) => q.eq("reporterId", args.testUserId))
      .collect();
    for (const r of reports) {
      await ctx.db.delete(r._id);
    }

    // Delete challenge participations (by userId index)
    const challengeParticipations = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();
    for (const cp of challengeParticipations) {
      await ctx.db.delete(cp._id);
    }

    // Delete challenges created by this user (and their remaining participants)
    const challengesCreated = await ctx.db
      .query("challenges")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.testUserId))
      .collect();
    for (const challenge of challengesCreated) {
      // Delete all participants of this challenge
      const participants = await ctx.db
        .query("challengeParticipants")
        .withIndex("by_challengeId_currentValue", (q) =>
          q.eq("challengeId", challenge._id),
        )
        .collect();
      for (const p of participants) {
        await ctx.db.delete(p._id);
      }
      await ctx.db.delete(challenge._id);
    }

    // Delete user badges
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();
    for (const badge of userBadges) {
      await ctx.db.delete(badge._id);
    }

    // Delete profiles
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const profile of profiles) {
      // Clean up avatar storage if present
      if (profile.avatarStorageId) {
        try {
          await ctx.storage.delete(profile.avatarStorageId);
        } catch {
          // Orphan is harmless
        }
      }
      await ctx.db.delete(profile._id);
    }
  },
});

// ── Exercise Progress helpers ────────────────────────────────────────────────

/**
 * Test version of getExerciseProgress that accepts testUserId instead of auth.
 */
export const testGetExerciseProgress = query({
  args: {
    testUserId: v.string(),
    exerciseId: v.id("exercises"),
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await computeExerciseProgress(
      ctx.db,
      args.testUserId,
      args.exerciseId,
      args.periodDays,
    );
  },
});

/**
 * Patch a workout's completedAt timestamp — for testing time-range filters.
 */
export const testPatchWorkoutCompletedAt = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== args.testUserId)
      throw new Error("Workout does not belong to user");

    await ctx.db.patch(args.workoutId, { completedAt: args.completedAt });
  },
});

// ── Volume Analytics helpers ─────────────────────────────────────────────────

/**
 * Test version of getVolumeByMuscleGroup that accepts testUserId instead of auth.
 */
export const testGetVolumeByMuscleGroup = query({
  args: {
    testUserId: v.string(),
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await computeVolumeByMuscleGroup(
      ctx.db,
      args.testUserId,
      args.periodDays,
    );
  },
});

/**
 * Test version of getWeeklySummary that accepts testUserId instead of auth.
 */
export const testGetWeeklySummary = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await computePeriodSummary(ctx.db, args.testUserId, 7, true);
  },
});

/**
 * Test version of getMonthlySummary that accepts testUserId instead of auth.
 */
export const testGetMonthlySummary = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await computePeriodSummary(ctx.db, args.testUserId, 30, true);
  },
});

// ── Leaderboard test helpers ─────────────────────────────────────────────────

/**
 * Test version of setLeaderboardOptIn — patches profile's leaderboardOptIn
 * field for a test user without auth.
 */
export const testSetLeaderboardOptIn = mutation({
  args: {
    testUserId: v.string(),
    optIn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .first();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, { leaderboardOptIn: args.optIn });
  },
});

/**
 * Test version of getLeaderboard — mirrors the auth-gated query but accepts
 * no auth. Returns entries with profile info, post-filtered by opt-in.
 */
export const testGetLeaderboard = query({
  args: {
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    period: v.literal("allTime"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

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

/**
 * Test version of getMyRank — mirrors the auth-gated query but accepts
 * testUserId directly instead of reading from auth context.
 */
export const testGetMyRank = query({
  args: {
    testUserId: v.string(),
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    period: v.literal("allTime"),
  },
  handler: async (ctx, args) => {
    // Check caller's opt-in status
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
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

    let rank = 0;
    for (const entry of entries) {
      const entryProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
        .first();

      if (entryProfile && entryProfile.leaderboardOptIn === true) {
        rank++;
        if (entry.userId === args.testUserId) {
          return { rank, value: entry.value, totalScanned };
        }
      }
    }

    return { rank: null as number | null, value: null as number | null, totalScanned };
  },
});

/**
 * Test helper to directly call updateLeaderboardEntries for a user+workout
 * without going through finishWorkout.
 */
export const testUpdateLeaderboardEntries = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    await updateLeaderboardEntries(ctx.db, args.testUserId, args.workoutId);
  },
});

/**
 * Test version of getLeaderboardExercises — mirrors the auth-gated query
 * without auth. Returns distinct exercises that have leaderboard entries.
 */
export const testGetLeaderboardExercises = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .take(500);

    const exerciseIdSet = new Set<string>();
    for (const entry of entries) {
      exerciseIdSet.add(entry.exerciseId as string);
    }

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

    exercises.sort((a, b) => a.name.localeCompare(b.name));

    return exercises;
  },
});

/**
 * Test helper to patch a leaderboard entry's updatedAt — for testing
 * period-filtered queries.
 */
export const testPatchLeaderboardEntryUpdatedAt = mutation({
  args: {
    testUserId: v.string(),
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .filter((q) =>
        q.and(
          q.eq(q.field("exerciseId"), args.exerciseId),
          q.eq(q.field("metric"), args.metric),
        ),
      )
      .first();

    if (!entry) throw new Error("Leaderboard entry not found");

    await ctx.db.patch(entry._id, { updatedAt: args.updatedAt });
  },
});

/**
 * Test helper to get raw leaderboard entries for a user (unfiltered by opt-in).
 * Useful for verifying entries exist before/after operations.
 */
export const testGetRawLeaderboardEntries = query({
  args: {
    testUserId: v.string(),
    exerciseId: v.optional(v.id("exercises")),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    if (args.exerciseId) {
      entries = entries.filter((e) => e.exerciseId === args.exerciseId);
    }

    return entries;
  },
});

// ── Challenge test helpers (T02) ─────────────────────────────────────────────

/**
 * Test version of createChallenge — accepts testUserId directly.
 * Does NOT schedule via ctx.scheduler (test environment — verification script
 * calls testActivateChallenge / testCompleteChallenge directly).
 * Creator auto-joins.
 */
export const testCreateChallenge = mutation({
  args: {
    testUserId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: challengeType,
    exerciseId: v.optional(v.id("exercises")),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate time bounds
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

    const challengeId = await ctx.db.insert("challenges", {
      creatorId: args.testUserId,
      title: args.title,
      description: args.description,
      type: args.type,
      exerciseId: args.exerciseId,
      status: startsImmediately ? "active" : "pending",
      startAt: args.startAt,
      endAt: args.endAt,
      createdAt: now,
    });

    // Creator auto-joins
    await ctx.db.insert("challengeParticipants", {
      challengeId,
      userId: args.testUserId,
      currentValue: 0,
      joinedAt: now,
    });

    return challengeId;
  },
});

/**
 * Test version of joinChallenge — accepts testUserId directly.
 * Enforces duplicate prevention and participant cap.
 */
export const testJoinChallenge = mutation({
  args: {
    testUserId: v.string(),
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.status !== "pending" && challenge.status !== "active") {
      throw new Error("Challenge must be pending or active to join");
    }

    // Check for duplicate join
    const existing = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_userId", (q) =>
        q.eq("challengeId", args.challengeId).eq("userId", args.testUserId),
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

    const participantId = await ctx.db.insert("challengeParticipants", {
      challengeId: args.challengeId,
      userId: args.testUserId,
      currentValue: 0,
      joinedAt: Date.now(),
    });

    return participantId;
  },
});

/**
 * Test version of leaveChallenge — accepts testUserId directly.
 * Creator cannot leave their own challenge.
 */
export const testLeaveChallenge = mutation({
  args: {
    testUserId: v.string(),
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.creatorId === args.testUserId) {
      throw new Error(
        "Challenge creator cannot leave — cancel the challenge instead",
      );
    }

    const participant = await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_userId", (q) =>
        q.eq("challengeId", args.challengeId).eq("userId", args.testUserId),
      )
      .first();

    if (!participant) {
      throw new Error("Not a participant in this challenge");
    }

    await ctx.db.delete(participant._id);
  },
});

/**
 * Test version of cancelChallenge — accepts testUserId directly.
 * Only creator can cancel. No scheduler cancellation (test env).
 */
export const testCancelChallenge = mutation({
  args: {
    testUserId: v.string(),
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.creatorId !== args.testUserId) {
      throw new Error("Only the challenge creator can cancel");
    }

    if (challenge.status !== "pending" && challenge.status !== "active") {
      throw new Error("Challenge must be pending or active to cancel");
    }

    await ctx.db.patch(args.challengeId, {
      status: "cancelled",
    });
  },
});

/**
 * Test version of getChallengeStandings — no auth required.
 * Returns participants ordered by currentValue desc with profile enrichment.
 */
export const testGetChallengeStandings = query({
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
      .order("desc")
      .take(100);

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
 * Test version of listChallenges — no auth, optional status filter.
 */
export const testListChallenges = query({
  args: {
    status: v.optional(challengeStatus),
  },
  handler: async (ctx, args) => {
    let challenges;

    if (args.status) {
      challenges = await ctx.db
        .query("challenges")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(50);
    } else {
      challenges = await ctx.db.query("challenges").order("desc").take(50);
    }

    // Enrich with participant count
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
 * Test version of getChallenge — no auth. Returns challenge doc + participant count.
 */
export const testGetChallenge = query({
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

/**
 * Test version of completeChallenge — mirrors the internal mutation.
 * Idempotent: returns early if challenge is not "active".
 * Determines winner (highest currentValue) and transitions to "completed".
 */
export const testCompleteChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.status !== "active") {
      console.log(
        `[Challenge] testCompleteChallenge(${args.challengeId}): already ${challenge.status}, skipping`,
      );
      return;
    }

    // Find winner: top participant by currentValue
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
      `[Challenge] testCompleteChallenge(${args.challengeId}): completed, winner=${topParticipant?.userId ?? "none"}`,
    );
  },
});

/**
 * Test version of activateChallenge — mirrors the internal mutation.
 * Transitions pending → active.
 */
export const testActivateChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    if (challenge.status !== "pending") {
      console.log(
        `[Challenge] testActivateChallenge(${args.challengeId}): already ${challenge.status}, skipping`,
      );
      return;
    }

    await ctx.db.patch(args.challengeId, {
      status: "active",
    });

    console.log(
      `[Challenge] testActivateChallenge(${args.challengeId}): activated`,
    );
  },
});

/**
 * Test helper to get raw participant docs (no profile enrichment).
 * Useful for assertions in the verification script.
 */
export const testGetRawParticipants = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("challengeParticipants")
      .withIndex("by_challengeId_currentValue", (q) =>
        q.eq("challengeId", args.challengeId),
      )
      .order("desc")
      .collect();
  },
});

/**
 * Test helper to call updateChallengeProgress for a user+workout
 * after testFinishWorkout (the test finishWorkout doesn't call challenge hooks).
 */
export const testUpdateChallengeProgress = mutation({
  args: {
    testUserId: v.string(),
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    await updateChallengeProgress(ctx.db, args.testUserId, args.workoutId);
  },
});

// ── Badge test helpers (S03) ────────────────────────────────────────────────

import { evaluateAndAwardBadges } from "./lib/badgeEvaluation";
import { BADGE_DEFINITIONS } from "./lib/badgeDefinitions";

// Pre-build slug→definition lookup (mirrors badges.ts)
const _badgeDefsBySlug = new Map(
  BADGE_DEFINITIONS.map((d) => [d.slug, d]),
);

/**
 * Test version of evaluateAndAwardBadges — accepts testUserId directly.
 * Runs the full badge evaluation pipeline for the given user.
 */
export const testEvaluateAndAwardBadges = mutation({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await evaluateAndAwardBadges(ctx.db, args.testUserId);
  },
});

/**
 * Test version of getUserBadges — no auth required.
 * Returns enriched badges matching the public getUserBadges query output.
 */
export const testGetUserBadges = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const badges = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    const enriched = badges.map((badge) => {
      const def = _badgeDefsBySlug.get(badge.badgeSlug);
      return {
        _id: badge._id,
        badgeSlug: badge.badgeSlug,
        awardedAt: badge.awardedAt,
        name: def?.name ?? "Unknown Badge",
        emoji: def?.emoji ?? "❓",
        description: def?.description ?? "Unknown badge",
        category: def?.category ?? "workoutCount",
      };
    });

    enriched.sort((a, b) => b.awardedAt - a.awardedAt);
    return enriched;
  },
});

/**
 * Test helper to directly award a badge — for controlled test setup.
 * Inserts a badge row without running the evaluation pipeline.
 */
export const testAwardBadge = mutation({
  args: {
    testUserId: v.string(),
    badgeSlug: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("userBadges", {
      userId: args.testUserId,
      badgeSlug: args.badgeSlug,
      awardedAt: Date.now(),
    });
  },
});

/**
 * Test helper to get raw userBadges docs (no enrichment).
 * Useful for low-level assertions on DB state.
 */
export const testGetRawUserBadges = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();
  },
});

/**
 * Test helper to get badge count for a user — quick integer check.
 */
export const testGetUserBadgeCount = query({
  args: {
    testUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const badges = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();
    return badges.length;
  },
});
