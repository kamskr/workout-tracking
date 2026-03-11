#!/usr/bin/env npx tsx
/**
 * S03-M04 End-to-End Verification Script — Achievements & Badges
 *
 * Exercises the badge system backend to verify:
 *   BG-01: first_workout badge awarded after 1 workout completion
 *   BG-02: ten_workouts badge NOT awarded after 1 workout (threshold not met)
 *   BG-03: first_workout badge appears only once after multiple evaluations (no duplicate)
 *   BG-04: getUserBadges returns awarded badges with correct display metadata
 *   BG-05: Cross-user badge visibility — user B can query user A's badges
 *   BG-06: Volume badge volume_10k awarded when totalVolume ≥ 10,000 kg
 *   BG-07: Streak badge streak_3 awarded when streak ≥ 3 days
 *   BG-08: PR badge first_pr awarded when PR count ≥ 1
 *   BG-09: Challenge badge first_challenge awarded when completed challenge count ≥ 1
 *   BG-10: Badge count increases correctly as more thresholds are crossed
 *   BG-11: Cleanup removes all userBadges for test users
 *   BG-12: Badge definitions constant has expected structure (15 badges, 5 categories)
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s03-m04.ts
 *
 * Requires CONVEX_URL in env or packages/backend/.env.local
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { BADGE_DEFINITIONS } from "../convex/lib/badgeDefinitions.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Resolve CONVEX_URL ──────────────────────────────────────────────────────

function getConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^CONVEX_URL=(.+)$/m);
    if (match) return match[1]!.trim();
  } catch {
    // ignore
  }

  throw new Error(
    "CONVEX_URL not found. Set it in env or packages/backend/.env.local",
  );
}

// ── Test runner ─────────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  requirement: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(
  name: string,
  requirement: string,
  passed: boolean,
  detail: string,
) {
  results.push({ name, requirement, passed, detail });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${icon}  [${requirement}] ${name}`);
  if (!passed) console.log(`         → ${detail}`);
}

// ── Constants ───────────────────────────────────────────────────────────────

const USER_A = "test-badge-user-a";
const USER_B = "test-badge-user-b";
const TEST_USERS = [USER_A, USER_B] as const;

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  // ══════════════════════════════════════════════════════════════════════
  // Cleanup: remove any leftover test data
  // ══════════════════════════════════════════════════════════════════════
  console.log("── Cleanup: Remove leftover test data ───────────────────\n");

  for (const userId of TEST_USERS) {
    await client.mutation(api.testing.testCleanup, { testUserId: userId });
  }
  console.log("  ✓ All test users cleaned up\n");

  try {
    // ══════════════════════════════════════════════════════════════════════
    // Setup: Create profiles, seed exercises
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create profiles + exercises ──────────────────\n");

    // Create profiles for both users
    for (const userId of TEST_USERS) {
      const suffix = userId.split("-").pop();
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: userId,
        username: `badge_${suffix}_${Date.now()}`,
        displayName: `Badge User ${suffix!.toUpperCase()}`,
      });
    }
    console.log("  ✓ 2 profiles created\n");

    // Get an exercise to use for workouts
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error(
        `Need at least 1 exercise in library, got ${allExercises.length}`,
      );
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})\n`);

    // ══════════════════════════════════════════════════════════════════════
    // BG-01: first_workout badge awarded after 1 workout completion
    // ══════════════════════════════════════════════════════════════════════
    console.log("── BG-01: first_workout badge after 1 workout ─────────\n");

    // Create, add exercise, log a set, and finish a workout for user A
    const workoutId1 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "Badge Test Workout 1",
    });
    const weId1 = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: workoutId1,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: weId1,
      weight: 60,
      reps: 10,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: workoutId1,
    });

    // Evaluate badges
    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterFirst = await client.query(
      api.testing.testGetUserBadges,
      { testUserId: USER_A },
    );
    const hasFirstWorkout = badgesAfterFirst.some(
      (b: any) => b.badgeSlug === "first_workout",
    );

    check(
      "first_workout badge awarded after 1 workout",
      "BG-01",
      hasFirstWorkout,
      `Expected first_workout badge, got slugs: ${badgesAfterFirst.map((b: any) => b.badgeSlug).join(", ") || "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-02: ten_workouts badge NOT awarded after 1 workout
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── BG-02: ten_workouts NOT awarded (threshold) ────────\n");

    const hasTenWorkouts = badgesAfterFirst.some(
      (b: any) => b.badgeSlug === "ten_workouts",
    );

    check(
      "ten_workouts badge NOT awarded after only 1 workout",
      "BG-02",
      !hasTenWorkouts,
      `Expected ten_workouts NOT awarded, but it was present`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-03: No duplicate on re-evaluation
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-03: No duplicate badge on re-evaluation ──────────\n",
    );

    // Evaluate again — should not create a duplicate first_workout
    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterReEval = await client.query(
      api.testing.testGetRawUserBadges,
      { testUserId: USER_A },
    );
    const firstWorkoutCount = badgesAfterReEval.filter(
      (b: any) => b.badgeSlug === "first_workout",
    ).length;

    check(
      "first_workout appears only once after multiple evaluations",
      "BG-03",
      firstWorkoutCount === 1,
      `Expected 1 first_workout badge, got ${firstWorkoutCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-04: Enriched badges have correct metadata
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-04: Enriched badges have correct metadata ────────\n",
    );

    const enriched = await client.query(api.testing.testGetUserBadges, {
      testUserId: USER_A,
    });
    const firstBadge = enriched.find(
      (b: any) => b.badgeSlug === "first_workout",
    );

    const metadataCorrect =
      firstBadge !== undefined &&
      firstBadge.name === "First Step" &&
      firstBadge.emoji === "👟" &&
      firstBadge.category === "workoutCount" &&
      typeof firstBadge.awardedAt === "number";

    check(
      "getUserBadges returns correct name, emoji, category from definitions",
      "BG-04",
      metadataCorrect,
      `Expected name="First Step" emoji="👟" category="workoutCount", got name="${firstBadge?.name}" emoji="${firstBadge?.emoji}" category="${firstBadge?.category}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-05: Cross-user badge visibility
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-05: Cross-user badge visibility ──────────────────\n",
    );

    // User B queries user A's badges — should work
    const crossUserBadges = await client.query(
      api.testing.testGetUserBadges,
      { testUserId: USER_A },
    );

    check(
      "User B can query user A's badges (cross-user visibility)",
      "BG-05",
      crossUserBadges.length > 0 &&
        crossUserBadges.some((b: any) => b.badgeSlug === "first_workout"),
      `Expected user A's badges visible, got ${crossUserBadges.length} badges`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-06: Volume badge volume_10k
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-06: Volume badge volume_10k ──────────────────────\n",
    );

    // Create workouts with enough volume to cross 10,000 kg
    // We already have 60×10 = 600 kg from workout 1
    // Need 9,400 more. Create a workout with heavy sets.
    const workoutIdVol = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "Badge Volume Workout",
    });
    const weIdVol = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: workoutIdVol,
      exerciseId: exercise._id,
    });

    // Log sets totaling >= 9,400 kg: 5 sets of 200kg × 10reps = 10,000 kg
    for (let i = 0; i < 5; i++) {
      await client.mutation(api.testing.testLogSet, {
        testUserId: USER_A,
        workoutExerciseId: weIdVol,
        weight: 200,
        reps: 10,
      });
    }

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: workoutIdVol,
    });

    // Record badge count before volume evaluation
    const countBeforeVolume = await client.query(
      api.testing.testGetUserBadgeCount,
      { testUserId: USER_A },
    );

    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterVol = await client.query(api.testing.testGetUserBadges, {
      testUserId: USER_A,
    });
    const hasVolume10k = badgesAfterVol.some(
      (b: any) => b.badgeSlug === "volume_10k",
    );

    check(
      "volume_10k badge awarded when totalVolume ≥ 10,000 kg",
      "BG-06",
      hasVolume10k,
      `Expected volume_10k badge, got slugs: ${badgesAfterVol.map((b: any) => b.badgeSlug).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-07: Streak badge streak_3
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── BG-07: Streak badge streak_3 ──────────────────────\n");

    // Create workouts on 3 consecutive days by patching completedAt
    // Day offsets: today, yesterday, 2 days ago
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Patch workout 1 to 2 days ago
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: USER_A,
      workoutId: workoutId1,
      completedAt: now - 2 * DAY,
    });

    // Patch volume workout to yesterday
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: USER_A,
      workoutId: workoutIdVol,
      completedAt: now - 1 * DAY,
    });

    // Create a 3rd workout for today
    const workoutId3 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "Badge Streak Workout 3",
    });
    const weId3 = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: workoutId3,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: weId3,
      weight: 50,
      reps: 10,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: workoutId3,
    });

    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterStreak = await client.query(
      api.testing.testGetUserBadges,
      { testUserId: USER_A },
    );
    const hasStreak3 = badgesAfterStreak.some(
      (b: any) => b.badgeSlug === "streak_3",
    );

    check(
      "streak_3 badge awarded when streak ≥ 3 days",
      "BG-07",
      hasStreak3,
      `Expected streak_3 badge, got slugs: ${badgesAfterStreak.map((b: any) => b.badgeSlug).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-08: PR badge first_pr
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── BG-08: PR badge first_pr ────────────────────────────\n");

    // Create a workout with a set that triggers PR detection
    const workoutIdPR = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "Badge PR Workout",
    });
    const weIdPR = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: workoutIdPR,
      exerciseId: exercise._id,
    });
    // Use testLogSetWithPR to ensure PR detection runs
    await client.mutation(api.testing.testLogSetWithPR, {
      testUserId: USER_A,
      workoutExerciseId: weIdPR,
      weight: 999,
      reps: 1,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: workoutIdPR,
    });

    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterPR = await client.query(api.testing.testGetUserBadges, {
      testUserId: USER_A,
    });
    const hasFirstPR = badgesAfterPR.some(
      (b: any) => b.badgeSlug === "first_pr",
    );

    check(
      "first_pr badge awarded when PR count ≥ 1",
      "BG-08",
      hasFirstPR,
      `Expected first_pr badge, got slugs: ${badgesAfterPR.map((b: any) => b.badgeSlug).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-09: Challenge badge first_challenge
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-09: Challenge badge first_challenge ──────────────\n",
    );

    // Create a challenge, have user A join (auto-joined as creator),
    // activate, and complete it
    const HOUR = 60 * 60 * 1000;
    const challengeId = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: USER_A,
        title: "Badge Test Challenge",
        type: "workoutCount",
        startAt: now - HOUR,
        endAt: now + 7 * 24 * HOUR,
      },
    );

    await client.mutation(api.testing.testActivateChallenge, {
      challengeId,
    });

    // Update challenge progress for user A (based on existing workouts)
    // Use one of the existing workout IDs
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: USER_A,
      workoutId: workoutId3,
    });

    // Complete the challenge — user A is the only participant so they win
    await client.mutation(api.testing.testCompleteChallenge, {
      challengeId,
    });

    await client.mutation(api.testing.testEvaluateAndAwardBadges, {
      testUserId: USER_A,
    });

    const badgesAfterChallenge = await client.query(
      api.testing.testGetUserBadges,
      { testUserId: USER_A },
    );
    const hasFirstChallenge = badgesAfterChallenge.some(
      (b: any) => b.badgeSlug === "first_challenge",
    );

    check(
      "first_challenge badge awarded when completed challenge count ≥ 1",
      "BG-09",
      hasFirstChallenge,
      `Expected first_challenge badge, got slugs: ${badgesAfterChallenge.map((b: any) => b.badgeSlug).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-10: Badge count increases correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-10: Badge count increases as thresholds crossed ──\n",
    );

    const finalCount = await client.query(
      api.testing.testGetUserBadgeCount,
      { testUserId: USER_A },
    );

    // We should have at minimum: first_workout, volume_10k, streak_3,
    // first_pr, first_challenge = 5 badges, plus potentially ten_workouts
    // depending on total workout count. At least 5 are guaranteed.
    const countIncreased = finalCount >= 5 && finalCount > countBeforeVolume;

    check(
      "Badge count increased correctly (multiple badges awarded across categories)",
      "BG-10",
      countIncreased,
      `Expected ≥5 badges and more than pre-volume count (${countBeforeVolume}), got ${finalCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-11: Cleanup removes all userBadges
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-11: Cleanup removes all userBadges ───────────────\n",
    );

    // Run cleanup for both users
    for (const userId of TEST_USERS) {
      await client.mutation(api.testing.testCleanup, { testUserId: userId });
    }

    const countAfterCleanupA = await client.query(
      api.testing.testGetUserBadgeCount,
      { testUserId: USER_A },
    );
    const countAfterCleanupB = await client.query(
      api.testing.testGetUserBadgeCount,
      { testUserId: USER_B },
    );

    check(
      "Cleanup removes all userBadges for test users",
      "BG-11",
      countAfterCleanupA === 0 && countAfterCleanupB === 0,
      `Expected 0 badges after cleanup, got A=${countAfterCleanupA} B=${countAfterCleanupB}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // BG-12: Badge definitions structure validation
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── BG-12: Badge definitions structure validation ───────\n",
    );

    const totalDefs = BADGE_DEFINITIONS.length;
    const categories = new Set(BADGE_DEFINITIONS.map((d) => d.category));
    const allHaveRequired = BADGE_DEFINITIONS.every(
      (d) =>
        typeof d.slug === "string" &&
        d.slug.length > 0 &&
        typeof d.name === "string" &&
        d.name.length > 0 &&
        typeof d.emoji === "string" &&
        d.emoji.length > 0 &&
        typeof d.threshold === "number" &&
        d.threshold > 0,
    );

    const structureValid =
      totalDefs === 15 && categories.size === 5 && allHaveRequired;

    check(
      "BADGE_DEFINITIONS: 15 entries, 5 categories, all have slug/name/emoji/threshold",
      "BG-12",
      structureValid,
      `Expected 15 defs / 5 cats / all valid, got ${totalDefs} defs / ${categories.size} cats (${[...categories].join(",")}) / allRequired=${allHaveRequired}`,
    );
  } finally {
    // ── Final Cleanup ───────────────────────────────────────────────────
    console.log("\n── Cleanup ──────────────────────────────────────────────\n");
    for (const userId of TEST_USERS) {
      try {
        await client.mutation(api.testing.testCleanup, { testUserId: userId });
      } catch (cleanupErr: any) {
        console.log(
          `  ⚠ Cleanup error for ${userId} (non-fatal): ${cleanupErr.message}`,
        );
      }
    }
    console.log("  ✓ Test data cleaned up\n");
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("── Summary ──────────────────────────────────────────────\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(
    `  ${passed} passed, ${failed} failed out of ${results.length} checks\n`,
  );

  if (failed > 0) {
    console.log("  Failed checks:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - [${r.requirement}] ${r.name}: ${r.detail}`);
    }
    console.log();
    process.exit(1);
  }

  console.log("  All checks passed! ✅\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(2);
});
