#!/usr/bin/env npx tsx
/**
 * S02-M02 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify Exercise Progress (chart data) query:
 *   EP-01: Correct data point count (one per completed workout with the exercise)
 *   EP-02: maxWeight is highest working set weight per session
 *   EP-03: totalVolume is sum of weight×reps for working sets per session
 *   EP-04: estimated1RM matches Epley for best set in session
 *   EP-05: Warmup sets excluded from all metrics
 *   EP-06: Data points sorted by date ascending
 *   EP-07: periodDays filter returns only recent workouts
 *   EP-08: Exercise with no completed workouts returns empty array
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s02-m02.ts
 *
 * Requires CONVEX_URL in env or packages/backend/.env.local
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
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

// ── Epley helper (mirrors prDetection.ts for expected-value calculation) ────

function epley(weight: number, reps: number): number | undefined {
  if (reps > 15) return undefined;
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

// ── Constants ───────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-user-verify-s02-m02";
const DAY_MS = 86_400_000;

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  // Clean up any leftover test data from previous runs
  await client.mutation(api.testing.testCleanup, {
    testUserId: TEST_USER_ID,
  });

  try {
    // Get exercises to use
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 2) {
      throw new Error(
        `Need at least 2 exercises in library, got ${allExercises.length}`,
      );
    }
    const exerciseA = allExercises[0]!;
    const exerciseB = allExercises[1]!;

    // ══════════════════════════════════════════════════════════════════════
    // Setup: create 3 workouts for exerciseA over time, 1 for exerciseB
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create workouts with known set data ──────────\n");

    // --- Workout 1 (old — 90 days ago) ---
    const w1Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "EP Workout 1 (old)",
    });
    const we1A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w1Id,
      exerciseId: exerciseA._id,
    });
    // Working sets: 60kg×10, 70kg×8
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 60, reps: 10,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 70, reps: 8,
    });
    // Warmup set: 40kg×5 (should be excluded)
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 40, reps: 5,
      isWarmup: true,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w1Id,
    });
    // Backdate to 90 days ago
    const w1CompletedAt = Date.now() - 90 * DAY_MS;
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w1Id,
      completedAt: w1CompletedAt,
    });
    console.log("  ✓ Workout 1 created (90 days ago) — 60×10, 70×8, warmup 40×5");

    // --- Workout 2 (recent — 5 days ago) ---
    const w2Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "EP Workout 2 (recent)",
    });
    const we2A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w2Id,
      exerciseId: exerciseA._id,
    });
    // Working sets: 80kg×6, 85kg×4
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      weight: 80, reps: 6,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      weight: 85, reps: 4,
    });
    // Bodyweight set (no weight — should be skipped)
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      reps: 20,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w2Id,
    });
    const w2CompletedAt = Date.now() - 5 * DAY_MS;
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w2Id,
      completedAt: w2CompletedAt,
    });
    console.log("  ✓ Workout 2 created (5 days ago) — 80×6, 85×4, bodyweight×20");

    // --- Workout 3 (recent — 1 day ago) ---
    const w3Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "EP Workout 3 (recent)",
    });
    const we3A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w3Id,
      exerciseId: exerciseA._id,
    });
    // Working sets: 90kg×3, 75kg×8
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we3A,
      weight: 90, reps: 3,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we3A,
      weight: 75, reps: 8,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w3Id,
    });
    const w3CompletedAt = Date.now() - 1 * DAY_MS;
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w3Id,
      completedAt: w3CompletedAt,
    });
    console.log("  ✓ Workout 3 created (1 day ago) — 90×3, 75×8");

    // --- Workout 4 (different exercise — exerciseB, recent) ---
    const w4Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "EP Workout 4 (different exercise)",
    });
    const we4B = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w4Id,
      exerciseId: exerciseB._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we4B,
      weight: 50, reps: 12,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w4Id,
    });
    console.log("  ✓ Workout 4 created (exerciseB) — 50×12\n");

    // ══════════════════════════════════════════════════════════════════════
    // Precomputed expected values
    // ══════════════════════════════════════════════════════════════════════

    // W1 exerciseA: working sets 60×10, 70×8
    //   maxWeight = 70
    //   totalVolume = 60*10 + 70*8 = 600 + 560 = 1160
    //   est1RM: max(epley(60,10), epley(70,8)) = max(80, 88.67) = 88.67
    const w1MaxWeight = 70;
    const w1Volume = 60 * 10 + 70 * 8; // 1160
    const w1Est1RM = epley(70, 8)!; // 70 * (1 + 8/30) = 88.667

    // W2 exerciseA: working sets 80×6, 85×4
    //   maxWeight = 85
    //   totalVolume = 80*6 + 85*4 = 480 + 340 = 820
    //   est1RM: max(epley(80,6), epley(85,4)) = max(96, 96.33) = 96.33
    const w2MaxWeight = 85;
    const w2Volume = 80 * 6 + 85 * 4; // 820
    const w2Est1RM = epley(85, 4)!; // 85 * (1 + 4/30) = 96.333

    // W3 exerciseA: working sets 90×3, 75×8
    //   maxWeight = 90
    //   totalVolume = 90*3 + 75*8 = 270 + 600 = 870
    //   est1RM: max(epley(90,3), epley(75,8)) = max(99, 95) = 99
    const w3MaxWeight = 90;
    const w3Volume = 90 * 3 + 75 * 8; // 870
    const w3Est1RM = epley(90, 3)!; // 90 * (1 + 3/30) = 99

    // ══════════════════════════════════════════════════════════════════════
    // Fetch progress data (all time)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Fetching exercise progress data ─────────────────────\n");

    const progress = await client.query(api.testing.testGetExerciseProgress, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    console.log(`  Got ${progress.length} data points for exerciseA\n`);

    // ══════════════════════════════════════════════════════════════════════
    // EP-01: Correct data point count
    // ══════════════════════════════════════════════════════════════════════
    console.log("── EP-01: Correct data point count ─────────────────────\n");

    check(
      "One data point per completed workout with exerciseA",
      "EP-01",
      progress.length === 3,
      `Expected 3 data points (3 workouts with exerciseA), got ${progress.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-02: maxWeight is highest working set weight per session
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-02: maxWeight accuracy ────────────────────────────\n");

    const ep02Pass =
      progress.length === 3 &&
      progress[0]!.maxWeight === w1MaxWeight &&
      progress[1]!.maxWeight === w2MaxWeight &&
      progress[2]!.maxWeight === w3MaxWeight;

    check(
      "maxWeight equals highest working set weight per session",
      "EP-02",
      ep02Pass,
      `Expected [${w1MaxWeight}, ${w2MaxWeight}, ${w3MaxWeight}], got [${progress.map((p) => p.maxWeight).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-03: totalVolume accuracy
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-03: totalVolume accuracy ──────────────────────────\n");

    const ep03Pass =
      progress.length === 3 &&
      progress[0]!.totalVolume === w1Volume &&
      progress[1]!.totalVolume === w2Volume &&
      progress[2]!.totalVolume === w3Volume;

    check(
      "totalVolume equals sum of weight×reps for working sets",
      "EP-03",
      ep03Pass,
      `Expected [${w1Volume}, ${w2Volume}, ${w3Volume}], got [${progress.map((p) => p.totalVolume).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-04: estimated1RM matches Epley for best set
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-04: estimated1RM accuracy ────────────────────────\n");

    const tolerance = 0.01;
    const ep04Pass =
      progress.length === 3 &&
      Math.abs((progress[0]!.estimated1RM ?? 0) - w1Est1RM) < tolerance &&
      Math.abs((progress[1]!.estimated1RM ?? 0) - w2Est1RM) < tolerance &&
      Math.abs((progress[2]!.estimated1RM ?? 0) - w3Est1RM) < tolerance;

    check(
      "estimated1RM matches Epley formula for best set in session",
      "EP-04",
      ep04Pass,
      `Expected [${w1Est1RM.toFixed(2)}, ${w2Est1RM.toFixed(2)}, ${w3Est1RM.toFixed(2)}], got [${progress.map((p) => (p.estimated1RM ?? 0).toFixed(2)).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-05: Warmup sets excluded from all metrics
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-05: Warmup sets excluded ─────────────────────────\n");

    // W1 had a warmup 40×5. If included:
    //   maxWeight would still be 70 (not affected here)
    //   totalVolume would be 1160 + 200 = 1360 (but we got 1160)
    //   est1RM might change (epley(40,5) = 46.67, not the max)
    // The volume check is the strongest signal
    const ep05Pass =
      progress.length >= 1 &&
      progress[0]!.totalVolume === w1Volume; // 1160, not 1360

    check(
      "Warmup sets excluded — W1 volume is 1160, not 1360",
      "EP-05",
      ep05Pass,
      `Expected W1 totalVolume=${w1Volume} (warmup excluded), got ${progress[0]?.totalVolume ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-06: Data points sorted by date ascending
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-06: Sorted by date ascending ─────────────────────\n");

    let sorted = true;
    for (let i = 1; i < progress.length; i++) {
      if (progress[i]!.date < progress[i - 1]!.date) {
        sorted = false;
        break;
      }
    }

    check(
      "Data points sorted by date ascending",
      "EP-06",
      progress.length >= 2 && sorted,
      `Dates: [${progress.map((p) => new Date(p.date).toISOString()).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-07: periodDays filter returns only recent workouts
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-07: periodDays time-range filter ──────────────────\n");

    // W1 = 90 days ago, W2 = 5 days ago, W3 = 1 day ago
    // periodDays=30 should return only W2 and W3
    const recentProgress = await client.query(api.testing.testGetExerciseProgress, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
      periodDays: 30,
    });

    check(
      "periodDays=30 returns only workouts within last 30 days",
      "EP-07",
      recentProgress.length === 2,
      `Expected 2 data points (W2 + W3), got ${recentProgress.length}. Dates: [${recentProgress.map((p) => new Date(p.date).toISOString()).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // EP-08: Exercise with no completed workouts returns empty array
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── EP-08: Empty result for unused exercise ─────────────\n");

    // Use an exercise that has no completed workouts for this user
    // We can pick exerciseB only if it has no workouts — but we created W4 with exerciseB.
    // So instead, pick a 3rd exercise that was never used, or query for exerciseA
    // from a non-existent user. Let's use exerciseB progress for a different user.
    // Actually, exerciseB has W4 — let's create a scenario. We'll use a 3rd exercise
    // if available, or query progress for an exercise that exists but has no workouts.
    let emptyExerciseId: any;
    if (allExercises.length >= 3) {
      emptyExerciseId = allExercises[2]!._id;
    } else {
      // Fallback: create a new workout with exerciseB that's not completed
      // Actually, exerciseB already has a completed workout. Let's query
      // exerciseA but with a very short periodDays that excludes all workouts.
      // That would test EP-07 again, not EP-08.
      // Best approach: just use exerciseA with a different testUserId.
      // Actually, the simplest: query for exerciseB from our user — it has 1 workout.
      // Instead, pick a different exercise from the library.
      emptyExerciseId = exerciseA._id; // fallback, will test separately
    }

    // Query for an exercise that this user has never done
    // If there's a 3rd exercise, it won't have any workouts for TEST_USER_ID
    if (allExercises.length >= 3) {
      const emptyProgress = await client.query(api.testing.testGetExerciseProgress, {
        testUserId: TEST_USER_ID,
        exerciseId: emptyExerciseId,
      });

      check(
        "Exercise with no completed workouts returns empty array",
        "EP-08",
        Array.isArray(emptyProgress) && emptyProgress.length === 0,
        `Expected empty array, got ${emptyProgress.length} data points`,
      );
    } else {
      // Fallback: query exerciseA from a different user
      const emptyProgress = await client.query(api.testing.testGetExerciseProgress, {
        testUserId: "test-user-nonexistent-ep08",
        exerciseId: exerciseA._id,
      });

      check(
        "Exercise with no completed workouts returns empty array",
        "EP-08",
        Array.isArray(emptyProgress) && emptyProgress.length === 0,
        `Expected empty array, got ${emptyProgress.length} data points`,
      );
    }

  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    console.log("\n── Cleanup ──────────────────────────────────────────────\n");
    try {
      await client.mutation(api.testing.testCleanup, {
        testUserId: TEST_USER_ID,
      });
      console.log("  ✓ Test data cleaned up");
    } catch (cleanupErr: any) {
      console.log(`  ⚠ Cleanup error (non-fatal): ${cleanupErr.message}`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n── Summary ──────────────────────────────────────────────\n");

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
