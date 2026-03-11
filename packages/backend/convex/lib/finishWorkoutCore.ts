/**
 * Shared workout completion core — the single source of truth for
 * finishing a workout and running post-completion hooks.
 *
 * Extracted from `finishWorkout` so that both direct user completion
 * and session-driven completion (endSession, checkSessionTimeouts)
 * go through the same pipeline: feed item, leaderboard, challenge, badge.
 *
 * All 4 hooks are non-fatal: individual failures are logged but never
 * prevent the workout from being marked as completed.
 */

import { GenericDatabaseWriter } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import { updateLeaderboardEntries } from "./leaderboardCompute";
import { updateChallengeProgress } from "./challengeCompute";
import { evaluateAndAwardBadges } from "./badgeEvaluation";

/**
 * Finish a workout and run all post-completion hooks.
 *
 * Idempotent: if the workout is already completed, returns early with
 * existing completedAt/durationSeconds (no error, no duplicate hooks).
 *
 * @throws if workout not found
 * @returns { completedAt, durationSeconds }
 */
export async function finishWorkoutCore(
  db: GenericDatabaseWriter<DataModel>,
  userId: string,
  workoutId: Id<"workouts">,
): Promise<{ completedAt: number; durationSeconds: number }> {
  const workout = await db.get(workoutId);
  if (!workout) {
    throw new Error(`Workout not found: ${workoutId}`);
  }

  // Idempotent: already completed → return existing values, skip hooks
  if (workout.status === "completed") {
    return {
      completedAt: workout.completedAt ?? Date.now(),
      durationSeconds: workout.durationSeconds ?? 0,
    };
  }

  // Compute duration and mark completed
  const completedAt = Date.now();
  const durationSeconds = Math.round(
    (completedAt - (workout.startedAt ?? completedAt)) / 1000,
  );

  await db.patch(workoutId, {
    status: "completed",
    completedAt,
    durationSeconds,
  });

  // ── Hook 1: Create feed item (non-fatal) ─────────────────────────────
  try {
    const workoutExercises = await db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
      .collect();
    const exerciseCount = workoutExercises.length;

    const prs = await db
      .query("personalRecords")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
      .collect();
    const prCount = prs.length;

    await db.insert("feedItems", {
      authorId: userId,
      type: "workout_completed",
      workoutId,
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
      `[finishWorkoutCore] Feed item error for workout ${workoutId}: ${err}`,
    );
  }

  // ── Hook 2: Update leaderboard entries (non-fatal) ────────────────────
  try {
    await updateLeaderboardEntries(db, userId, workoutId);
  } catch (err) {
    console.error(
      `[finishWorkoutCore] Leaderboard error for workout ${workoutId}: ${err}`,
    );
  }

  // ── Hook 3: Update challenge progress (non-fatal) ─────────────────────
  try {
    await updateChallengeProgress(db, userId, workoutId);
  } catch (err) {
    console.error(
      `[finishWorkoutCore] Challenge error for workout ${workoutId}: ${err}`,
    );
  }

  // ── Hook 4: Evaluate and award badges (non-fatal) ─────────────────────
  try {
    await evaluateAndAwardBadges(db, userId);
  } catch (err) {
    console.error(
      `[finishWorkoutCore] Badge error for user ${userId}: ${err}`,
    );
  }

  return { completedAt, durationSeconds };
}
