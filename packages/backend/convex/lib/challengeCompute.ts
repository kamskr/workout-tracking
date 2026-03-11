/**
 * Challenge progress computation helper.
 *
 * Called from `finishWorkout` to incrementally update participant standings
 * for all active challenges the user is participating in.
 *
 * Supports 4 challenge types:
 *   - workoutCount: +1 per completed workout (no exercise filter)
 *   - totalReps:    Sum of reps from working sets matching the challenge exercise
 *   - totalVolume:  Sum of weight×reps from working sets matching the challenge exercise
 *   - maxWeight:    Max weight from working sets matching the challenge exercise (compare-and-update)
 */

import { GenericDatabaseWriter } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";

/**
 * Update challenge progress for all active challenges a user participates in
 * after completing a workout.
 *
 * Uses incremental delta computation — only processes the current workout's
 * sets, not all historical data. For maxWeight, compares-and-updates rather
 * than adding.
 */
export async function updateChallengeProgress(
  db: GenericDatabaseWriter<DataModel>,
  userId: string,
  workoutId: Id<"workouts">,
): Promise<void> {
  // Find all challenge participations for this user
  const participations = await db
    .query("challengeParticipants")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  if (participations.length === 0) return;

  const now = Date.now();

  for (const participant of participations) {
    // Fetch the challenge and check it's active and within time bounds
    const challenge = await db.get(participant.challengeId);
    if (!challenge) continue;
    if (challenge.status !== "active") continue;
    if (now > challenge.endAt) continue;

    if (challenge.type === "workoutCount") {
      // workoutCount: simply increment by 1 per finished workout
      await db.patch(participant._id, {
        currentValue: participant.currentValue + 1,
      });
      continue;
    }

    // For exercise-specific types, we need the workout's sets
    // matching the challenge's exerciseId
    if (!challenge.exerciseId) continue;

    const workoutExercises = await db
      .query("workoutExercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
      .collect();

    // Filter to workout exercises matching the challenge's exercise
    const matchingWEs = workoutExercises.filter(
      (we) => we.exerciseId === challenge.exerciseId,
    );

    if (matchingWEs.length === 0) continue;

    // Collect all sets from matching workout exercises
    const allSets = [];
    for (const we of matchingWEs) {
      const sets = await db
        .query("sets")
        .withIndex("by_workoutExerciseId", (q) =>
          q.eq("workoutExerciseId", we._id),
        )
        .collect();
      allSets.push(...sets);
    }

    if (challenge.type === "totalReps") {
      // Working sets with valid reps (weight not required for reps-only)
      const workingSets = allSets.filter(
        (s) => !s.isWarmup && s.reps !== undefined && s.reps > 0,
      );
      const delta = workingSets.reduce((sum, s) => sum + s.reps!, 0);
      if (delta > 0) {
        await db.patch(participant._id, {
          currentValue: participant.currentValue + delta,
        });
      }
    } else if (challenge.type === "totalVolume") {
      // Working sets with valid weight and reps
      const workingSets = allSets.filter(
        (s) =>
          !s.isWarmup &&
          s.weight !== undefined &&
          s.weight > 0 &&
          s.reps !== undefined &&
          s.reps > 0,
      );
      const delta = workingSets.reduce(
        (sum, s) => sum + s.weight! * s.reps!,
        0,
      );
      if (delta > 0) {
        await db.patch(participant._id, {
          currentValue: participant.currentValue + delta,
        });
      }
    } else if (challenge.type === "maxWeight") {
      // Working sets with valid weight
      const workingSets = allSets.filter(
        (s) =>
          !s.isWarmup &&
          s.weight !== undefined &&
          s.weight > 0 &&
          s.reps !== undefined &&
          s.reps > 0,
      );
      let maxWeight = 0;
      for (const s of workingSets) {
        if (s.weight! > maxWeight) {
          maxWeight = s.weight!;
        }
      }
      // Compare-and-update: only update if new max exceeds current value
      if (maxWeight > participant.currentValue) {
        await db.patch(participant._id, {
          currentValue: maxWeight,
        });
      }
    }
  }
}
