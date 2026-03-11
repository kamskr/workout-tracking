import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get all PRs achieved during a specific workout.
 * Joins exercise name from the exercises table.
 * Auth-gated — throws if no authenticated user.
 */
export const getWorkoutPRs = query({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    // Verify workout ownership
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId !== userId) throw new Error("Workout does not belong to user");

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", args.workoutId))
      .collect();

    // Join exercise names
    const results = await Promise.all(
      prs.map(async (pr) => {
        const exercise = await ctx.db.get(pr.exerciseId);
        return {
          type: pr.type,
          value: pr.value,
          exerciseId: pr.exerciseId,
          exerciseName: exercise?.name ?? "Unknown",
          setId: pr.setId,
          achievedAt: pr.achievedAt,
        };
      }),
    );

    return results;
  },
});

/**
 * Get all PRs for a specific exercise for the current user.
 * Returns the current best per PR type.
 * Auth-gated — throws if no authenticated user.
 */
export const getPersonalRecords = query({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const prs = await ctx.db
      .query("personalRecords")
      .withIndex("by_userId_exerciseId", (q) =>
        q.eq("userId", userId).eq("exerciseId", args.exerciseId),
      )
      .collect();

    return prs.map((pr) => ({
      type: pr.type,
      value: pr.value,
      setId: pr.setId,
      workoutId: pr.workoutId,
      achievedAt: pr.achievedAt,
    }));
  },
});
