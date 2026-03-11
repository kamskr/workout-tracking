/**
 * Badge evaluation engine.
 *
 * Evaluates all badge definitions against a user's aggregate stats and awards
 * any newly qualified badges. Designed to be called from `finishWorkout` as a
 * non-fatal hook.
 *
 * Performance characteristics:
 * - Fetches existing badges once (builds Set<string> for O(1) dedup)
 * - Computes 5 aggregate stats in batch (workout count, volume, streak, PRs, challenges)
 * - Iterates 15 badge definitions with threshold comparison — skips already-awarded
 * - Self-healing: missed badges will be picked up on the next workout completion
 */

import { GenericDatabaseWriter } from "convex/server";
import { DataModel } from "../_generated/dataModel";
import { BADGE_DEFINITIONS } from "./badgeDefinitions";
import { computePeriodSummary } from "../analytics";
import { computeCurrentStreak } from "../profiles";

/**
 * Evaluate all badge definitions for a user and award any newly qualified badges.
 *
 * @param db - Convex database writer
 * @param userId - The user to evaluate badges for
 */
export async function evaluateAndAwardBadges(
  db: GenericDatabaseWriter<DataModel>,
  userId: string,
): Promise<void> {
  // 1. Fetch all existing badges for this user — build dedup set
  const existingBadges = await db
    .query("userBadges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const awardedSlugs = new Set<string>(
    existingBadges.map((b) => b.badgeSlug),
  );

  // 2. Batch-fetch aggregate stats

  // 2a. Workout count + total volume via computePeriodSummary (all-time)
  const periodSummary = await computePeriodSummary(db, userId, undefined);
  const workoutCount = periodSummary.workoutCount;
  const totalVolume = periodSummary.totalVolume;

  // 2b. Current streak
  const currentStreak = await computeCurrentStreak(db, userId);

  // 2c. PR count — count all personalRecords rows for this user
  const personalRecords = await db
    .query("personalRecords")
    .withIndex("by_userId_exerciseId", (q) => q.eq("userId", userId))
    .collect();
  const prCount = personalRecords.length;

  // 2d. Completed challenge count — join challengeParticipants → challenges
  const participations = await db
    .query("challengeParticipants")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  let completedChallengeCount = 0;
  for (const p of participations) {
    const challenge = await db.get(p.challengeId);
    if (challenge && challenge.status === "completed") {
      completedChallengeCount++;
    }
  }

  // 3. Build stat map for threshold comparison
  const stats: Record<string, number> = {
    workoutCount,
    totalVolume,
    currentStreak,
    prCount,
    completedChallengeCount,
  };

  // 4. Evaluate each badge definition
  const now = Date.now();
  for (const badge of BADGE_DEFINITIONS) {
    // Skip already-awarded badges
    if (awardedSlugs.has(badge.slug)) continue;

    // Check if the user's stat meets the threshold
    const statValue = stats[badge.statKey] ?? 0;
    if (statValue >= badge.threshold) {
      await db.insert("userBadges", {
        userId,
        badgeSlug: badge.slug,
        awardedAt: now,
      });
    }
  }
}
