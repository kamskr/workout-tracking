/**
 * Personal Record (PR) detection logic.
 *
 * Shared helper used by both `logSet` (auth-gated) and `testLogSet` (test helper)
 * to detect and upsert PRs after a set is logged.
 *
 * PR types (D049):
 *   - weight: Estimated 1RM via Epley formula (D045)
 *   - volume: Session exercise total (sum of weight×reps across all working sets)
 *   - reps:   Most reps in a single working set (regardless of weight)
 */

import { GenericDatabaseWriter } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PRDetectionResult {
  weight?: boolean;
  volume?: boolean;
  reps?: boolean;
}

interface SetData {
  weight?: number;
  reps?: number;
  isWarmup: boolean;
}

interface ExistingSetRecord {
  weight?: number;
  reps?: number;
  isWarmup: boolean;
}

// ── Epley Formula ────────────────────────────────────────────────────────────

/**
 * Estimate 1RM via Epley formula: weight × (1 + reps/30).
 * For 1 rep, returns actual weight.
 * Returns undefined if reps > 15 (unreliable above this range).
 */
export function estimateOneRepMax(weight: number, reps: number): number | undefined {
  if (reps > 15) return undefined;
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

// ── Main Detection Logic ─────────────────────────────────────────────────────

/**
 * Detect and store PRs after a set is logged.
 *
 * @param db        — Convex database writer
 * @param userId    — Owner of the set
 * @param exerciseId — Exercise being performed
 * @param workoutId  — Parent workout
 * @param setId      — The just-inserted set
 * @param setData    — weight, reps, isWarmup for the current set
 * @param existingSets — All other sets for this workoutExercise (used for volume calc)
 */
export async function detectAndStorePRs(
  db: GenericDatabaseWriter<DataModel>,
  userId: string,
  exerciseId: Id<"exercises">,
  workoutId: Id<"workouts">,
  setId: Id<"sets">,
  setData: SetData,
  existingSets: ExistingSetRecord[],
): Promise<PRDetectionResult> {
  const result: PRDetectionResult = {};

  // Skip warmup sets entirely
  if (setData.isWarmup) return result;

  // Fetch exercise doc to check type — skip cardio/stretch
  const exercise = await db.get(exerciseId);
  if (!exercise) return result;
  if (exercise.exerciseType === "cardio" || exercise.exerciseType === "stretch") {
    return result;
  }

  const now = Date.now();

  // Fetch existing PRs for this user+exercise once
  const existingPRs = await db
    .query("personalRecords")
    .withIndex("by_userId_exerciseId", (q) =>
      q.eq("userId", userId).eq("exerciseId", exerciseId),
    )
    .collect();

  // ── Weight PR (Epley estimated 1RM) ──────────────────────────────────
  if (
    setData.weight !== undefined &&
    setData.weight > 0 &&
    setData.reps !== undefined &&
    setData.reps > 0
  ) {
    const estimated1RM = estimateOneRepMax(setData.weight, setData.reps);
    if (estimated1RM !== undefined) {
      const currentWeightPR = existingPRs.find((pr) => pr.type === "weight");
      if (!currentWeightPR || estimated1RM > currentWeightPR.value) {
        if (currentWeightPR) {
          await db.patch(currentWeightPR._id, {
            value: estimated1RM,
            setId,
            workoutId,
            achievedAt: now,
          });
        } else {
          await db.insert("personalRecords", {
            userId,
            exerciseId,
            type: "weight",
            value: estimated1RM,
            setId,
            workoutId,
            achievedAt: now,
          });
        }
        result.weight = true;
      }
    }
  }

  // ── Volume PR (session exercise total) ───────────────────────────────
  if (
    setData.weight !== undefined &&
    setData.weight > 0 &&
    setData.reps !== undefined &&
    setData.reps > 0
  ) {
    // Sum volume across all working sets for this exercise session,
    // including the current set
    let totalVolume = 0;
    for (const s of existingSets) {
      if (
        !s.isWarmup &&
        s.weight !== undefined &&
        s.weight > 0 &&
        s.reps !== undefined &&
        s.reps > 0
      ) {
        totalVolume += s.weight * s.reps;
      }
    }
    // Add current set
    totalVolume += setData.weight * setData.reps;

    const currentVolumePR = existingPRs.find((pr) => pr.type === "volume");
    if (!currentVolumePR || totalVolume > currentVolumePR.value) {
      if (currentVolumePR) {
        await db.patch(currentVolumePR._id, {
          value: totalVolume,
          setId,
          workoutId,
          achievedAt: now,
        });
      } else {
        await db.insert("personalRecords", {
          userId,
          exerciseId,
          type: "volume",
          value: totalVolume,
          setId,
          workoutId,
          achievedAt: now,
        });
      }
      result.volume = true;
    }
  }

  // ── Rep PR (most reps in a single working set, regardless of weight) ──
  if (
    setData.reps !== undefined &&
    setData.reps > 0 &&
    setData.weight !== undefined &&
    setData.weight > 0
  ) {
    const currentRepsPR = existingPRs.find((pr) => pr.type === "reps");
    if (!currentRepsPR || setData.reps > currentRepsPR.value) {
      if (currentRepsPR) {
        await db.patch(currentRepsPR._id, {
          value: setData.reps,
          setId,
          workoutId,
          achievedAt: now,
        });
      } else {
        await db.insert("personalRecords", {
          userId,
          exerciseId,
          type: "reps",
          value: setData.reps,
          setId,
          workoutId,
          achievedAt: now,
        });
      }
      result.reps = true;
    }
  }

  return result;
}
