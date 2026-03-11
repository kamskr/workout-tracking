#!/usr/bin/env npx tsx
/**
 * S03-M02 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify Volume Analytics queries:
 *   VM-01: Volume by muscle group returns correct primary volume totals
 *   VM-02: Secondary muscle groups attributed at 50%
 *   VM-03: Warmup sets excluded from volume
 *   VM-04: Bodyweight sets (no weight) excluded from volume but included in set count
 *   VM-05: Percentages sum to ~100%
 *   VM-06: periodDays filter narrows results correctly
 *   VM-07: Weekly summary workoutCount is correct
 *   VM-08: Weekly summary totalVolume matches manual calculation
 *   VM-09: Monthly summary includes workouts beyond 7 days
 *   VM-10: topExercises returns top 3 by volume with correct names
 *   VM-11: Empty result for user with no completed workouts
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s03-m02.ts
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

// ── Constants ───────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-user-verify-s03-m02";
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
    // Get exercises with known muscle groups from the library
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 5) {
      throw new Error(
        `Need at least 5 exercises in library, got ${allExercises.length}`,
      );
    }

    // Pick exercises with specific muscle group profiles:
    // exerciseA: "Barbell Bench Press" — chest primary, [triceps, shoulders] secondary
    // exerciseB: "Barbell Row" — back primary, [biceps] secondary
    // exerciseC: "Bodyweight Squat" — legs primary, [core] secondary (bodyweight)
    const exerciseA = allExercises.find((e) => e.slug === "barbell-bench-press");
    const exerciseB = allExercises.find((e) => e.slug === "barbell-row");
    const exerciseC = allExercises.find((e) => e.slug === "bodyweight-squat");

    if (!exerciseA || !exerciseB || !exerciseC) {
      throw new Error(
        `Missing required exercises. Found: bench=${!!exerciseA}, row=${!!exerciseB}, squat=${!!exerciseC}`,
      );
    }

    console.log(`  Using exercises:`);
    console.log(`    A: ${exerciseA.name} (${exerciseA.primaryMuscleGroup}, secondary: ${exerciseA.secondaryMuscleGroups.join(",")})`);
    console.log(`    B: ${exerciseB.name} (${exerciseB.primaryMuscleGroup}, secondary: ${exerciseB.secondaryMuscleGroups.join(",")})`);
    console.log(`    C: ${exerciseC.name} (${exerciseC.primaryMuscleGroup}, secondary: ${exerciseC.secondaryMuscleGroups.join(",")})\n`);

    // ══════════════════════════════════════════════════════════════════════
    // Setup: Create 3 completed workouts spanning different time ranges
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create workouts with known set data ──────────\n");

    // --- Workout 1 (recent — 3 days ago, within weekly window) ---
    // Exercises: Bench Press + Barbell Row
    const w1Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "VM Workout 1 (3 days ago)",
    });

    // Bench Press: warmup 40×5, working sets 80×8, 90×6
    const we1A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w1Id,
      exerciseId: exerciseA._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 40, reps: 5, isWarmup: true,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 80, reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 90, reps: 6,
    });

    // Barbell Row: working sets 70×10, 75×8
    const we1B = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w1Id,
      exerciseId: exerciseB._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1B,
      weight: 70, reps: 10,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1B,
      weight: 75, reps: 8,
    });

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w1Id,
    });
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w1Id,
      completedAt: Date.now() - 3 * DAY_MS,
    });
    console.log("  ✓ Workout 1 created (3 days ago) — Bench: warmup 40×5, 80×8, 90×6; Row: 70×10, 75×8");

    // --- Workout 2 (recent — 5 days ago, within weekly window) ---
    // Exercises: Bench Press + Bodyweight Squat (no weight)
    const w2Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "VM Workout 2 (5 days ago)",
    });

    // Bench Press: working sets 85×6, 85×5
    const we2A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w2Id,
      exerciseId: exerciseA._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      weight: 85, reps: 6,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      weight: 85, reps: 5,
    });

    // Bodyweight Squat: no weight, just reps (should count sets but not volume)
    const we2C = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w2Id,
      exerciseId: exerciseC._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2C,
      reps: 20,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2C,
      reps: 15,
    });

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w2Id,
    });
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w2Id,
      completedAt: Date.now() - 5 * DAY_MS,
    });
    console.log("  ✓ Workout 2 created (5 days ago) — Bench: 85×6, 85×5; BW Squat: ×20, ×15");

    // --- Workout 3 (older — 15 days ago, within monthly but NOT weekly) ---
    // Exercises: Barbell Row
    const w3Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "VM Workout 3 (15 days ago)",
    });

    // Barbell Row: working sets 80×8, 80×8, 85×6
    const we3B = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: w3Id,
      exerciseId: exerciseB._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we3B,
      weight: 80, reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we3B,
      weight: 80, reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we3B,
      weight: 85, reps: 6,
    });

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: w3Id,
    });
    await client.mutation(api.testing.testPatchWorkoutCompletedAt, {
      testUserId: TEST_USER_ID,
      workoutId: w3Id,
      completedAt: Date.now() - 15 * DAY_MS,
    });
    console.log("  ✓ Workout 3 created (15 days ago) — Row: 80×8, 80×8, 85×6\n");

    // ══════════════════════════════════════════════════════════════════════
    // Precomputed expected values (all time / 30-day window)
    // ══════════════════════════════════════════════════════════════════════

    // W1 Bench Press (chest primary, [triceps, shoulders] secondary):
    //   Working sets: 80×8=640, 90×6=540 → total 1180
    //   Warmup 40×5 excluded
    //
    // W2 Bench Press:
    //   Working sets: 85×6=510, 85×5=425 → total 935
    //
    // W1 Barbell Row (back primary, [biceps] secondary):
    //   Working sets: 70×10=700, 75×8=600 → total 1300
    //
    // W3 Barbell Row:
    //   Working sets: 80×8=640, 80×8=640, 85×6=510 → total 1790
    //
    // W2 BW Squat (legs primary, [core] secondary):
    //   No weight sets (×20, ×15) → volume 0, setCount 2

    const benchVolume = 1180 + 935;       // 2115
    const rowVolume = 1300 + 1790;        // 3090

    // Primary volumes:
    const chestPrimary = benchVolume;     // 2115
    const backPrimary = rowVolume;        // 3090

    // Secondary volumes (50%):
    const tricepsSecondary = benchVolume * 0.5;   // 1057.5
    const shouldersSecondary = benchVolume * 0.5; // 1057.5
    const bicepsSecondary = rowVolume * 0.5;      // 1545

    // Legs: 0 volume (bodyweight only), 2 sets
    // Core: 0 volume (bodyweight only), 2 sets (secondary from BW squat)

    const grandTotal = chestPrimary + backPrimary + tricepsSecondary + shouldersSecondary + bicepsSecondary;
    // = 2115 + 3090 + 1057.5 + 1057.5 + 1545 = 8865

    // Weekly (last 7 days): W1 + W2 only
    // W1: bench 640+540=1180, row 700+600=1300 → 2480
    // W2: bench 510+425=935, BW squat 0 → 935
    const weeklyVolume = 1180 + 1300 + 935; // 3415
    const weeklyWorkoutCount = 2;
    // Working sets in weekly:
    // W1: bench 2 working + row 2 working = 4
    // W2: bench 2 working + BW squat 2 = 6
    const weeklySets = 4 + 4; // 8

    // Monthly (last 30 days): W1 + W2 + W3
    const monthlyVolume = weeklyVolume + 1790; // 3415 + 1790 = 5205
    const monthlyWorkoutCount = 3;
    // W3: row 3 working = 3
    const monthlySets = weeklySets + 3; // 11

    // Top exercises by volume (monthly):
    // Barbell Row: 1300 + 1790 = 3090
    // Barbell Bench Press: 1180 + 935 = 2115
    // BW Squat: 0 (not in top since 0 volume)

    // ══════════════════════════════════════════════════════════════════════
    // Fetch volume by muscle group (all time = same as monthly here)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Fetching volume by muscle group ─────────────────────\n");

    const volumeData = await client.query(api.testing.testGetVolumeByMuscleGroup, {
      testUserId: TEST_USER_ID,
    });

    console.log(`  Got ${volumeData.length} muscle groups\n`);
    for (const v of volumeData) {
      console.log(`    ${v.muscleGroup}: volume=${v.totalVolume}, sets=${v.setCount}, pct=${v.percentage.toFixed(1)}%`);
    }
    console.log();

    // ══════════════════════════════════════════════════════════════════════
    // VM-01: Volume by muscle group returns correct primary volume totals
    // ══════════════════════════════════════════════════════════════════════
    console.log("── VM-01: Primary volume totals ────────────────────────\n");

    const chestData = volumeData.find((v) => v.muscleGroup === "chest");
    const backData = volumeData.find((v) => v.muscleGroup === "back");

    const vm01Pass =
      chestData !== undefined &&
      Math.abs(chestData.totalVolume - chestPrimary) < 0.01 &&
      backData !== undefined &&
      Math.abs(backData.totalVolume - backPrimary) < 0.01;

    check(
      "Primary muscle group volumes are correct",
      "VM-01",
      vm01Pass,
      `Expected chest=${chestPrimary}, back=${backPrimary}. Got chest=${chestData?.totalVolume ?? "N/A"}, back=${backData?.totalVolume ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-02: Secondary muscle groups attributed at 50%
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-02: Secondary muscle group 50% attribution ───────\n");

    const tricepsData = volumeData.find((v) => v.muscleGroup === "triceps");
    const shouldersData = volumeData.find((v) => v.muscleGroup === "shoulders");
    const bicepsData = volumeData.find((v) => v.muscleGroup === "biceps");

    const vm02Pass =
      tricepsData !== undefined &&
      Math.abs(tricepsData.totalVolume - tricepsSecondary) < 0.01 &&
      shouldersData !== undefined &&
      Math.abs(shouldersData.totalVolume - shouldersSecondary) < 0.01 &&
      bicepsData !== undefined &&
      Math.abs(bicepsData.totalVolume - bicepsSecondary) < 0.01;

    check(
      "Secondary muscle groups get 50% volume attribution",
      "VM-02",
      vm02Pass,
      `Expected triceps=${tricepsSecondary}, shoulders=${shouldersSecondary}, biceps=${bicepsSecondary}. Got triceps=${tricepsData?.totalVolume ?? "N/A"}, shoulders=${shouldersData?.totalVolume ?? "N/A"}, biceps=${bicepsData?.totalVolume ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-03: Warmup sets excluded from volume
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-03: Warmup sets excluded ─────────────────────────\n");

    // If warmup 40×5 was included, chest would be 2115 + 200 = 2315
    const vm03Pass =
      chestData !== undefined &&
      Math.abs(chestData.totalVolume - chestPrimary) < 0.01;

    check(
      "Warmup sets excluded — chest volume is 2115, not 2315",
      "VM-03",
      vm03Pass,
      `Expected chest volume=${chestPrimary} (warmup excluded), got ${chestData?.totalVolume ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-04: Bodyweight sets (no weight) excluded from volume but in set count
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-04: Bodyweight set handling ──────────────────────\n");

    const legsData = volumeData.find((v) => v.muscleGroup === "legs");

    const vm04Pass =
      legsData !== undefined &&
      legsData.totalVolume === 0 &&
      legsData.setCount === 2;

    check(
      "Bodyweight sets: 0 volume, 2 sets counted for legs",
      "VM-04",
      vm04Pass,
      `Expected legs: volume=0, sets=2. Got volume=${legsData?.totalVolume ?? "N/A"}, sets=${legsData?.setCount ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-05: Percentages sum to ~100%
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-05: Percentages sum to ~100% ─────────────────────\n");

    // Only groups with volume > 0 have non-zero percentages
    const groupsWithVolume = volumeData.filter((v) => v.totalVolume > 0);
    const pctSum = groupsWithVolume.reduce((acc, v) => acc + v.percentage, 0);

    check(
      "Percentages of volume-bearing groups sum to ~100%",
      "VM-05",
      Math.abs(pctSum - 100) < 1,
      `Expected ~100%, got ${pctSum.toFixed(2)}%`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-06: periodDays filter narrows results correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-06: periodDays time-range filter ──────────────────\n");

    // periodDays=7 should exclude W3 (15 days ago) → only W1 + W2
    const weeklyVolData = await client.query(api.testing.testGetVolumeByMuscleGroup, {
      testUserId: TEST_USER_ID,
      periodDays: 7,
    });

    // In weekly window: row volume from W1 only = 1300 (not W3's 1790)
    const weeklyBackData = weeklyVolData.find((v) => v.muscleGroup === "back");
    const expectedWeeklyBack = 1300; // W1 row only

    check(
      "periodDays=7 excludes W3 — back volume is 1300, not 3090",
      "VM-06",
      weeklyBackData !== undefined &&
      Math.abs(weeklyBackData.totalVolume - expectedWeeklyBack) < 0.01,
      `Expected back=${expectedWeeklyBack} in 7-day window. Got ${weeklyBackData?.totalVolume ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-07: Weekly summary workoutCount is correct
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-07: Weekly summary workoutCount ──────────────────\n");

    const weekly = await client.query(api.testing.testGetWeeklySummary, {
      testUserId: TEST_USER_ID,
    });

    check(
      "Weekly summary workoutCount matches (W1 + W2 = 2)",
      "VM-07",
      weekly.workoutCount === weeklyWorkoutCount,
      `Expected ${weeklyWorkoutCount}, got ${weekly.workoutCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-08: Weekly summary totalVolume matches manual calculation
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-08: Weekly summary totalVolume ───────────────────\n");

    check(
      "Weekly summary totalVolume matches manual calculation",
      "VM-08",
      Math.abs(weekly.totalVolume - weeklyVolume) < 0.01,
      `Expected ${weeklyVolume}, got ${weekly.totalVolume}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-09: Monthly summary includes workouts beyond 7 days
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-09: Monthly summary includes W3 ─────────────────\n");

    const monthly = await client.query(api.testing.testGetMonthlySummary, {
      testUserId: TEST_USER_ID,
    });

    const vm09Pass =
      monthly.workoutCount === monthlyWorkoutCount &&
      Math.abs(monthly.totalVolume - monthlyVolume) < 0.01;

    check(
      "Monthly summary includes W3 (15 days ago) — 3 workouts, correct volume",
      "VM-09",
      vm09Pass,
      `Expected count=${monthlyWorkoutCount}, volume=${monthlyVolume}. Got count=${monthly.workoutCount}, volume=${monthly.totalVolume}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-10: topExercises returns top 3 by volume with correct names
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-10: topExercises ranking ─────────────────────────\n");

    // Monthly top exercises by volume:
    //   1. Barbell Row: 3090
    //   2. Barbell Bench Press: 2115
    //   (BW Squat has 0 volume → not in top)
    const top = monthly.topExercises;

    const vm10Pass =
      top.length >= 2 &&
      top[0]!.exerciseName === exerciseB.name && // Barbell Row
      top[0]!.totalVolume === rowVolume &&
      top[1]!.exerciseName === exerciseA.name && // Barbell Bench Press
      top[1]!.totalVolume === benchVolume;

    check(
      "topExercises ranked by volume: Row=3090, Bench=2115",
      "VM-10",
      vm10Pass,
      `Expected [${exerciseB.name}=${rowVolume}, ${exerciseA.name}=${benchVolume}]. Got [${top.map((t) => `${t.exerciseName}=${t.totalVolume}`).join(", ")}]`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // VM-11: Empty result for user with no completed workouts
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── VM-11: Empty result for new user ────────────────────\n");

    const emptyVol = await client.query(api.testing.testGetVolumeByMuscleGroup, {
      testUserId: "test-user-nonexistent-s03",
    });
    const emptySummary = await client.query(api.testing.testGetWeeklySummary, {
      testUserId: "test-user-nonexistent-s03",
    });

    const vm11Pass =
      Array.isArray(emptyVol) &&
      emptyVol.length === 0 &&
      emptySummary.workoutCount === 0 &&
      emptySummary.totalVolume === 0 &&
      emptySummary.totalSets === 0 &&
      emptySummary.topExercises.length === 0;

    check(
      "User with no workouts gets empty volume array and zero summary",
      "VM-11",
      vm11Pass,
      `Volume: ${emptyVol.length} groups. Summary: count=${emptySummary.workoutCount}, vol=${emptySummary.totalVolume}`,
    );

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
