/**
 * Analytics queries for exercise progress data.
 *
 * Provides time-series data for charting exercise progression:
 * weight, volume, and estimated 1RM over completed workout sessions.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";
import { estimateOneRepMax } from "./lib/prDetection";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseProgressPoint {
  date: number;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number | undefined;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get exercise progress data for charting.
 *
 * Traverses completed workouts that include the given exercise,
 * aggregating per-session metrics from working sets only.
 *
 * Returns one data point per completed workout session, sorted by date ascending.
 * Returns empty array if no completed workouts contain this exercise.
 */
export const getExerciseProgress = query({
  args: {
    exerciseId: v.id("exercises"),
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ExerciseProgressPoint[]> => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await computeExerciseProgress(ctx.db, userId, args.exerciseId, args.periodDays);
  },
});

// ── Shared logic ─────────────────────────────────────────────────────────────

/**
 * Core exercise progress computation, extracted for reuse by test helper.
 */
export async function computeExerciseProgress(
  db: any,
  userId: string,
  exerciseId: any,
  periodDays?: number,
): Promise<ExerciseProgressPoint[]> {
  const cutoff = periodDays !== undefined
    ? Date.now() - periodDays * 86_400_000
    : undefined;

  // 1. Get all workoutExercises for this exercise
  const workoutExercises = await db
    .query("workoutExercises")
    .withIndex("by_exerciseId", (q: any) => q.eq("exerciseId", exerciseId))
    .collect();

  if (workoutExercises.length === 0) return [];

  // 2. For each, resolve the parent workout and filter
  const sessions: {
    workoutExerciseId: any;
    completedAt: number;
  }[] = [];

  for (const we of workoutExercises) {
    const workout = await db.get(we.workoutId);
    if (!workout) continue;
    if (workout.userId !== userId) continue;
    if (workout.status !== "completed") continue;
    if (!workout.completedAt) continue;
    if (cutoff !== undefined && workout.completedAt < cutoff) continue;

    sessions.push({
      workoutExerciseId: we._id,
      completedAt: workout.completedAt,
    });
  }

  if (sessions.length === 0) return [];

  // 3. For each qualifying session, collect sets and aggregate
  const dataPoints: ExerciseProgressPoint[] = [];

  for (const session of sessions) {
    const sets = await db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q: any) =>
        q.eq("workoutExerciseId", session.workoutExerciseId),
      )
      .collect();

    let maxWeight = 0;
    let totalVolume = 0;
    let bestEstimated1RM: number | undefined = undefined;
    let hasQualifyingSets = false;

    for (const set of sets) {
      // Skip warmup sets
      if (set.isWarmup) continue;
      // Skip sets without weight or reps
      if (set.weight === undefined || set.weight <= 0) continue;
      if (set.reps === undefined || set.reps <= 0) continue;

      hasQualifyingSets = true;

      // maxWeight
      if (set.weight > maxWeight) {
        maxWeight = set.weight;
      }

      // totalVolume
      totalVolume += set.weight * set.reps;

      // estimated1RM
      const e1rm = estimateOneRepMax(set.weight, set.reps);
      if (e1rm !== undefined) {
        if (bestEstimated1RM === undefined || e1rm > bestEstimated1RM) {
          bestEstimated1RM = e1rm;
        }
      }
    }

    // Skip sessions with zero qualifying working sets
    if (!hasQualifyingSets) continue;

    dataPoints.push({
      date: session.completedAt,
      maxWeight,
      totalVolume,
      estimated1RM: bestEstimated1RM,
    });
  }

  // 4. Sort by date ascending
  dataPoints.sort((a, b) => a.date - b.date);

  return dataPoints;
}
