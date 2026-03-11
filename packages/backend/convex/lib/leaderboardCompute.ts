/**
 * Leaderboard entry computation helper.
 *
 * Called from `finishWorkout` to pre-compute per-exercise leaderboard metrics.
 * Computes 3 metrics per exercise:
 *   - e1rm:   Estimated 1RM via Epley formula (best single set)
 *   - volume: Total working-set volume (Σ weight×reps, excluding warmups)
 *   - reps:   Max single-set reps (working sets only)
 *
 * Entries are always written regardless of opt-in status.
 * Opt-in filtering happens at query time (D114).
 */

import { GenericDatabaseWriter } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import { estimateOneRepMax } from "./prDetection";

type LeaderboardMetric = "e1rm" | "volume" | "reps";

interface ComputedMetric {
  metric: LeaderboardMetric;
  value: number;
}

/**
 * Compute and upsert leaderboard entries for all exercises in a finished workout.
 *
 * For each exercise in the workout, computes e1RM, volume, and reps metrics
 * from working sets (excluding warmups and sets without weight/reps).
 * Uses upsert pattern: only writes if the new value exceeds the existing entry.
 */
export async function updateLeaderboardEntries(
  db: GenericDatabaseWriter<DataModel>,
  userId: string,
  workoutId: Id<"workouts">,
): Promise<void> {
  // Fetch all workout exercises for this workout
  const workoutExercises = await db
    .query("workoutExercises")
    .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
    .collect();

  for (const we of workoutExercises) {
    // Fetch all sets for this workout exercise
    const sets = await db
      .query("sets")
      .withIndex("by_workoutExerciseId", (q) =>
        q.eq("workoutExerciseId", we._id),
      )
      .collect();

    // Filter to working sets with valid weight and reps (same filter as analytics/PR detection)
    const workingSets = sets.filter(
      (s) =>
        !s.isWarmup &&
        s.weight !== undefined &&
        s.weight > 0 &&
        s.reps !== undefined &&
        s.reps > 0,
    );

    if (workingSets.length === 0) continue;

    const metrics: ComputedMetric[] = [];

    // ── e1RM: best estimated 1RM across all working sets ──────────────
    let bestE1rm = 0;
    for (const s of workingSets) {
      const e1rm = estimateOneRepMax(s.weight!, s.reps!);
      if (e1rm !== undefined && e1rm > bestE1rm) {
        bestE1rm = e1rm;
      }
    }
    if (bestE1rm > 0) {
      metrics.push({ metric: "e1rm", value: bestE1rm });
    }

    // ── Volume: total weight×reps across all working sets ─────────────
    let totalVolume = 0;
    for (const s of workingSets) {
      totalVolume += s.weight! * s.reps!;
    }
    if (totalVolume > 0) {
      metrics.push({ metric: "volume", value: totalVolume });
    }

    // ── Reps: max single-set reps ─────────────────────────────────────
    let maxReps = 0;
    for (const s of workingSets) {
      if (s.reps! > maxReps) {
        maxReps = s.reps!;
      }
    }
    if (maxReps > 0) {
      metrics.push({ metric: "reps", value: maxReps });
    }

    // ── Upsert each metric into leaderboardEntries ────────────────────
    const now = Date.now();

    for (const { metric, value } of metrics) {
      // Query existing entry for this user+exercise+metric+period
      const existing = await db
        .query("leaderboardEntries")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("exerciseId"), we.exerciseId),
            q.eq(q.field("metric"), metric),
            q.eq(q.field("period"), "allTime"),
          ),
        )
        .first();

      if (existing) {
        // Only update if new value is greater
        if (value > existing.value) {
          await db.patch(existing._id, {
            value,
            workoutId,
            updatedAt: now,
          });
        }
      } else {
        // Insert new entry
        await db.insert("leaderboardEntries", {
          userId,
          exerciseId: we.exerciseId,
          metric,
          period: "allTime",
          value,
          workoutId,
          updatedAt: now,
        });
      }
    }
  }
}
