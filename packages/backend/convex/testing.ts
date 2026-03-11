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
import { detectAndStorePRs, type PRDetectionResult } from "./lib/prDetection";
import {
  computeExerciseProgress,
  computeVolumeByMuscleGroup,
  computePeriodSummary,
} from "./analytics";
import { computeCurrentStreak } from "./profiles";

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
    const summary = await computePeriodSummary(
      ctx.db,
      args.testUserId,
      undefined,
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

    // Delete user preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.testUserId))
      .collect();

    for (const pref of prefs) {
      await ctx.db.delete(pref._id);
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
    return await computePeriodSummary(ctx.db, args.testUserId, 7);
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
    return await computePeriodSummary(ctx.db, args.testUserId, 30);
  },
});
