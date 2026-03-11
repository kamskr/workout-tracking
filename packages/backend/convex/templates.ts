import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Save a completed workout as a reusable template.
 * Copies exercise structure (order, set count, first-set reps, rest) into template tables.
 */
export const saveAsTemplate = mutation({
  args: {
    workoutId: v.id("workouts"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");
    if (workout.status !== "completed") throw new Error("Workout is not completed");

    // Fetch workout exercises
    const workoutExercises = await ctx.db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    if (workoutExercises.length === 0) {
      throw new Error("Workout has no exercises — cannot save as template");
    }

    // Create the template
    const templateId = await ctx.db.insert("workoutTemplates", {
      userId,
      name: args.name,
      description: args.description,
      createdFromWorkoutId: args.workoutId,
    });

    // For each exercise, copy structure into templateExercises
    for (const we of workoutExercises) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q) => q.eq("workoutExerciseId", we._id))
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

/**
 * Delete a template and cascade-delete all its template exercises.
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== userId) throw new Error("Template does not belong to user");

    // Cascade-delete all template exercises
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

/**
 * Start a new workout from a template. Creates an inProgress workout with
 * exercises pre-filled from the template. Does NOT pre-create sets — user logs fresh.
 */
export const startWorkoutFromTemplate = mutation({
  args: {
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    // Check for active workout
    const activeWorkout = await ctx.db
      .query("workouts")
      .withIndex("by_userId_status", (q) => q.eq("userId", userId).eq("status", "inProgress"))
      .first();

    if (activeWorkout) {
      throw new Error("Cannot start from template: you already have an active workout");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== userId) throw new Error("Template does not belong to user");

    // Create the workout
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: template.name,
      status: "inProgress",
      startedAt: Date.now(),
    });

    // Fetch template exercises ordered by `order`
    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.templateId))
      .collect();

    templateExercises.sort((a, b) => a.order - b.order);

    // Create workout exercises from template (no sets — user logs fresh)
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

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * List all templates for the current user, newest first.
 */
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a template with all its exercises joined with exercise details.
 * Returns { template, exercises: [{ templateExercise, exercise }] }.
 */
export const getTemplateWithExercises = query({
  args: {
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    if (template.userId !== userId) throw new Error("Template does not belong to user");

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
          exercise, // may be null if exercise was deleted (stale reference)
        };
      }),
    );

    return { template, exercises };
  },
});
