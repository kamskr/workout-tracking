/**
 * Analytics queries for exercise progress and volume data.
 *
 * Provides:
 * - Time-series data for charting exercise progression (weight, volume, e1RM)
 * - Volume-by-muscle-group aggregation for heatmaps and bar charts
 * - Weekly/monthly summary cards (workout count, total volume, top exercises)
 *
 * All compute functions are extracted for reuse by test helpers.
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

// ── Volume by Muscle Group ───────────────────────────────────────────────────

export interface MuscleGroupVolume {
  muscleGroup: string;
  totalVolume: number;
  setCount: number;
  percentage: number;
}

/**
 * Get volume breakdown by muscle group for heatmap / bar chart.
 *
 * For each working set (non-warmup, weight > 0, reps > 0):
 * - 100% of weight×reps attributed to exercise's primary muscle group
 * - 50% of weight×reps attributed to each secondary muscle group
 *
 * Sets without weight but with reps (bodyweight) contribute to setCount only.
 */
export const getVolumeByMuscleGroup = query({
  args: {
    periodDays: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MuscleGroupVolume[]> => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await computeVolumeByMuscleGroup(ctx.db, userId, args.periodDays);
  },
});

/**
 * Core volume-by-muscle-group computation, extracted for reuse by test helper.
 */
export async function computeVolumeByMuscleGroup(
  db: any,
  userId: string,
  periodDays?: number,
): Promise<MuscleGroupVolume[]> {
  const cutoff = periodDays !== undefined
    ? Date.now() - periodDays * 86_400_000
    : undefined;

  // 1. Get completed workouts for user, filtered by period
  const workouts = await db
    .query("workouts")
    .withIndex("by_userId_completedAt", (q: any) => q.eq("userId", userId))
    .take(500);

  const completedWorkouts = workouts.filter(
    (w: any) =>
      w.status === "completed" &&
      w.completedAt &&
      (cutoff === undefined || w.completedAt >= cutoff),
  );

  if (completedWorkouts.length === 0) return [];

  // 2. Collect all workoutExercises for these workouts
  const allWorkoutExercises: any[] = [];
  for (const workout of completedWorkouts) {
    const wes = await db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q: any) => q.eq("workoutId", workout._id))
      .collect();
    allWorkoutExercises.push(...wes);
  }

  if (allWorkoutExercises.length === 0) return [];

  // 3. Batch-fetch all unique exercises into a Map
  const exerciseIdSet = new Set<string>();
  for (const we of allWorkoutExercises) {
    exerciseIdSet.add(we.exerciseId as string);
  }
  const exerciseMap = new Map<string, any>();
  const exerciseIdArr = Array.from(exerciseIdSet);
  for (const id of exerciseIdArr) {
    const exercise = await db.get(id);
    if (exercise) exerciseMap.set(id, exercise);
  }

  // 4. Aggregate volume and set counts by muscle group
  const volumeMap = new Map<string, number>();
  const setCountMap = new Map<string, number>();

  for (const we of allWorkoutExercises) {
    const exercise = exerciseMap.get(we.exerciseId as string);
    if (!exercise) continue;

    const sets = await db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q: any) =>
        q.eq("workoutExerciseId", we._id),
      )
      .collect();

    for (const set of sets) {
      // Skip warmup sets
      if (set.isWarmup) continue;
      // Skip sets without reps
      if (set.reps === undefined || set.reps <= 0) continue;

      const hasWeight = set.weight !== undefined && set.weight > 0;
      const volume = hasWeight ? set.weight * set.reps : 0;

      // Primary muscle group — 100% volume, always count sets
      const primary = exercise.primaryMuscleGroup as string;
      setCountMap.set(primary, (setCountMap.get(primary) ?? 0) + 1);
      if (volume > 0) {
        volumeMap.set(primary, (volumeMap.get(primary) ?? 0) + volume);
      }

      // Secondary muscle groups — 50% volume, count sets
      const secondaries = (exercise.secondaryMuscleGroups ?? []) as string[];
      for (const sec of secondaries) {
        setCountMap.set(sec, (setCountMap.get(sec) ?? 0) + 1);
        if (volume > 0) {
          volumeMap.set(sec, (volumeMap.get(sec) ?? 0) + volume * 0.5);
        }
      }
    }
  }

  // 5. Compute totals and percentages
  let grandTotal = 0;
  Array.from(volumeMap.values()).forEach((val) => { grandTotal += val; });

  const result: MuscleGroupVolume[] = [];
  const allGroupSet = new Set(Array.from(volumeMap.keys()).concat(Array.from(setCountMap.keys())));
  const allGroups = Array.from(allGroupSet);

  for (const group of allGroups) {
    const totalVolume = volumeMap.get(group) ?? 0;
    const setCount = setCountMap.get(group) ?? 0;
    result.push({
      muscleGroup: group,
      totalVolume,
      setCount,
      percentage: grandTotal > 0 ? (totalVolume / grandTotal) * 100 : 0,
    });
  }

  // Sort by volume descending
  result.sort((a, b) => b.totalVolume - a.totalVolume);

  return result;
}

// ── Period Summary (Weekly / Monthly) ────────────────────────────────────────

export interface TopExercise {
  exerciseName: string;
  totalVolume: number;
}

export interface PeriodSummary {
  workoutCount: number;
  totalVolume: number;
  totalSets: number;
  topExercises: TopExercise[];
}

/**
 * Get weekly summary (last 7 days).
 */
export const getWeeklySummary = query({
  args: {},
  handler: async (ctx): Promise<PeriodSummary> => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await computePeriodSummary(ctx.db, userId, 7, true);
  },
});

/**
 * Get monthly summary (last 30 days).
 */
export const getMonthlySummary = query({
  args: {},
  handler: async (ctx): Promise<PeriodSummary> => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    return await computePeriodSummary(ctx.db, userId, 30, true);
  },
});

/**
 * Core period summary computation, extracted for reuse by test helpers.
 */
export async function computePeriodSummary(
  db: any,
  userId: string,
  periodDays: number | undefined,
  includePrivate: boolean = true,
): Promise<PeriodSummary> {
  const cutoff = periodDays !== undefined
    ? Date.now() - periodDays * 86_400_000
    : undefined;

  // 1. Get completed workouts in period
  const workouts = await db
    .query("workouts")
    .withIndex("by_userId_completedAt", (q: any) => q.eq("userId", userId))
    .take(500);

  const completedWorkouts = workouts.filter(
    (w: any) =>
      w.status === "completed" &&
      w.completedAt &&
      (cutoff === undefined || w.completedAt >= cutoff) &&
      (includePrivate || w.isPublic !== false),
  );

  if (completedWorkouts.length === 0) {
    return { workoutCount: 0, totalVolume: 0, totalSets: 0, topExercises: [] };
  }

  // 2. Collect workoutExercises and batch-fetch exercises
  const allWorkoutExercises: any[] = [];
  for (const workout of completedWorkouts) {
    const wes = await db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q: any) => q.eq("workoutId", workout._id))
      .collect();
    allWorkoutExercises.push(...wes);
  }

  const exerciseIdSet2 = new Set<string>();
  for (const we of allWorkoutExercises) {
    exerciseIdSet2.add(we.exerciseId as string);
  }
  const exerciseMap = new Map<string, any>();
  const exerciseIdArr2 = Array.from(exerciseIdSet2);
  for (const id of exerciseIdArr2) {
    const exercise = await db.get(id);
    if (exercise) exerciseMap.set(id, exercise);
  }

  // 3. Aggregate across all sets
  let totalVolume = 0;
  let totalSets = 0;
  const exerciseVolumeMap = new Map<string, number>(); // exerciseId → volume

  for (const we of allWorkoutExercises) {
    const sets = await db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q: any) =>
        q.eq("workoutExerciseId", we._id),
      )
      .collect();

    for (const set of sets) {
      if (set.isWarmup) continue;
      if (set.reps === undefined || set.reps <= 0) continue;

      const hasWeight = set.weight !== undefined && set.weight > 0;

      // Count all non-warmup sets with reps
      totalSets++;

      if (hasWeight) {
        const vol = set.weight * set.reps;
        totalVolume += vol;

        const exId = we.exerciseId as string;
        exerciseVolumeMap.set(exId, (exerciseVolumeMap.get(exId) ?? 0) + vol);
      }
    }
  }

  // 4. Top 3 exercises by volume
  const sortedExercises = Array.from(exerciseVolumeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topExercises: TopExercise[] = sortedExercises.map(([exId, vol]) => {
    const exercise = exerciseMap.get(exId);
    return {
      exerciseName: exercise?.name ?? "Unknown",
      totalVolume: vol,
    };
  });

  return {
    workoutCount: completedWorkouts.length,
    totalVolume,
    totalSets,
    topExercises,
  };
}
