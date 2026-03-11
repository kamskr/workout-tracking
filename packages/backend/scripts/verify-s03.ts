#!/usr/bin/env npx tsx
/**
 * S03 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify:
 *   R003 — RPE/tempo/notes on sets (log, update, validation)
 *   R005 — Superset grouping (set/clear supersetGroupId on workoutExercises)
 *   R007 — Previous performance lookup (query last completed workout's sets for an exercise)
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s03.ts
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

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-user-verify-s03";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    // Get exercises to use throughout
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 2) {
      throw new Error(
        `Need at least 2 exercises in library, got ${allExercises.length}`,
      );
    }
    const exerciseA = allExercises[0]!;
    const exerciseB = allExercises[1]!;

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "── R003: RPE / Tempo / Notes on Sets ───────────────────\n",
    );

    // Setup: create workout + add exercise
    const r003WorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      { testUserId: TEST_USER_ID, name: "R003 Test" },
    );
    const r003WeId = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: r003WorkoutId,
      exerciseId: exerciseA._id,
    });

    // (a) Log set with rpe, tempo, notes → verify round-trip
    const setWithExtras = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: r003WeId,
      weight: 80,
      reps: 8,
      rpe: 8,
      tempo: "3-1-2-0",
      notes: "felt good",
    });

    const r003Details = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_USER_ID, id: r003WorkoutId },
    );

    const r003Sets = r003Details.exercises[0]?.sets ?? [];
    const r003Set = r003Sets.find((s: any) => s._id === setWithExtras);

    check(
      "Log set with rpe/tempo/notes round-trips correctly",
      "R003",
      r003Set?.rpe === 8 &&
        r003Set?.tempo === "3-1-2-0" &&
        r003Set?.notes === "felt good",
      `Expected rpe=8, tempo="3-1-2-0", notes="felt good"; got rpe=${r003Set?.rpe}, tempo="${r003Set?.tempo}", notes="${r003Set?.notes}"`,
    );

    // (b) UpdateSet to change rpe and notes → verify partial update preserved tempo
    await client.mutation(api.testing.testUpdateSet, {
      testUserId: TEST_USER_ID,
      setId: setWithExtras,
      rpe: 9,
      notes: "heavy",
    });

    const r003DetailsAfterUpdate = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_USER_ID, id: r003WorkoutId },
    );

    const r003SetUpdated = r003DetailsAfterUpdate.exercises[0]?.sets?.find(
      (s: any) => s._id === setWithExtras,
    );

    check(
      "UpdateSet partial update: rpe=9, notes changed, tempo preserved",
      "R003",
      r003SetUpdated?.rpe === 9 &&
        r003SetUpdated?.notes === "heavy" &&
        r003SetUpdated?.tempo === "3-1-2-0",
      `Expected rpe=9, notes="heavy", tempo="3-1-2-0"; got rpe=${r003SetUpdated?.rpe}, notes="${r003SetUpdated?.notes}", tempo="${r003SetUpdated?.tempo}"`,
    );

    // (c) Log set with rpe=11 → verify error
    let rpe11Error = "";
    try {
      await client.mutation(api.testing.testLogSet, {
        testUserId: TEST_USER_ID,
        workoutExerciseId: r003WeId,
        weight: 80,
        reps: 5,
        rpe: 11,
      });
    } catch (err: any) {
      rpe11Error = err.message;
    }

    check(
      "RPE=11 is rejected",
      "R003",
      rpe11Error.includes("RPE must be between 1 and 10"),
      `Expected error containing "RPE must be between 1 and 10", got "${rpe11Error}"`,
    );

    // (d) Log set with rpe=0 → verify error
    let rpe0Error = "";
    try {
      await client.mutation(api.testing.testLogSet, {
        testUserId: TEST_USER_ID,
        workoutExerciseId: r003WeId,
        weight: 80,
        reps: 5,
        rpe: 0,
      });
    } catch (err: any) {
      rpe0Error = err.message;
    }

    check(
      "RPE=0 is rejected",
      "R003",
      rpe0Error.includes("RPE must be between 1 and 10"),
      `Expected error containing "RPE must be between 1 and 10", got "${rpe0Error}"`,
    );

    // Cleanup R003 workout
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: r003WorkoutId,
    });

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R005: Superset Grouping ──────────────────────────────\n",
    );

    // Setup: create workout + add 2 exercises
    const r005WorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      { testUserId: TEST_USER_ID, name: "R005 Test" },
    );
    const r005We1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: r005WorkoutId,
      exerciseId: exerciseA._id,
    });
    const r005We2Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: r005WorkoutId,
      exerciseId: exerciseB._id,
    });

    // (a) Set superset group on both exercises
    await client.mutation(api.testing.testSetSupersetGroup, {
      testUserId: TEST_USER_ID,
      workoutExerciseIds: [r005We1Id, r005We2Id],
      supersetGroupId: "ss-1",
    });

    const r005Details = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_USER_ID, id: r005WorkoutId },
    );

    const r005We1 = r005Details.exercises.find(
      (e: any) => e.workoutExercise._id === r005We1Id,
    );
    const r005We2 = r005Details.exercises.find(
      (e: any) => e.workoutExercise._id === r005We2Id,
    );

    check(
      "setSupersetGroup sets groupId on both exercises",
      "R005",
      r005We1?.workoutExercise?.supersetGroupId === "ss-1" &&
        r005We2?.workoutExercise?.supersetGroupId === "ss-1",
      `Expected both supersetGroupId="ss-1", got we1="${r005We1?.workoutExercise?.supersetGroupId}", we2="${r005We2?.workoutExercise?.supersetGroupId}"`,
    );

    // (b) Clear superset group on one exercise
    await client.mutation(api.testing.testClearSupersetGroup, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: r005We1Id,
    });

    const r005DetailsAfterClear = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_USER_ID, id: r005WorkoutId },
    );

    const r005We1After = r005DetailsAfterClear.exercises.find(
      (e: any) => e.workoutExercise._id === r005We1Id,
    );
    const r005We2After = r005DetailsAfterClear.exercises.find(
      (e: any) => e.workoutExercise._id === r005We2Id,
    );

    check(
      "clearSupersetGroup clears one, other retains groupId",
      "R005",
      r005We1After?.workoutExercise?.supersetGroupId === undefined &&
        r005We2After?.workoutExercise?.supersetGroupId === "ss-1",
      `Expected we1=undefined, we2="ss-1"; got we1="${r005We1After?.workoutExercise?.supersetGroupId}", we2="${r005We2After?.workoutExercise?.supersetGroupId}"`,
    );

    // Cleanup R005 workout
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: r005WorkoutId,
    });

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R007: Previous Performance Lookup ───────────────────\n",
    );

    // (a) Create workout 1 with exercise A + 3 sets, finish it
    const r007Workout1Id = await client.mutation(
      api.testing.testCreateWorkout,
      { testUserId: TEST_USER_ID, name: "R007 Completed Workout" },
    );
    const r007We1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: r007Workout1Id,
      exerciseId: exerciseA._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: r007We1Id,
      weight: 60,
      reps: 10,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: r007We1Id,
      weight: 65,
      reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: r007We1Id,
      weight: 70,
      reps: 6,
    });

    // Wait a moment then finish so duration > 0
    await sleep(500);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: r007Workout1Id,
    });

    // Create workout 2 with same exercise (in progress)
    const r007Workout2Id = await client.mutation(
      api.testing.testCreateWorkout,
      { testUserId: TEST_USER_ID, name: "R007 Current Workout" },
    );
    await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: r007Workout2Id,
      exerciseId: exerciseA._id,
    });

    // Query previous performance for exercise A
    const prevPerf = await client.query(
      api.testing.testGetPreviousPerformance,
      {
        testUserId: TEST_USER_ID,
        exerciseId: exerciseA._id,
      },
    );

    check(
      "getPreviousPerformance returns data for completed exercise",
      "R007",
      prevPerf !== null,
      `Expected non-null result, got null`,
    );

    check(
      "getPreviousPerformance returns 3 sets with correct weights/reps",
      "R007",
      prevPerf !== null &&
        prevPerf.sets.length === 3 &&
        prevPerf.sets[0]?.weight === 60 &&
        prevPerf.sets[0]?.reps === 10 &&
        prevPerf.sets[1]?.weight === 65 &&
        prevPerf.sets[1]?.reps === 8 &&
        prevPerf.sets[2]?.weight === 70 &&
        prevPerf.sets[2]?.reps === 6,
      `Expected 3 sets [60/10, 65/8, 70/6]; got ${JSON.stringify(prevPerf?.sets)}`,
    );

    check(
      "getPreviousPerformance includes exercise name",
      "R007",
      prevPerf !== null &&
        typeof prevPerf.exerciseName === "string" &&
        prevPerf.exerciseName.length > 0,
      `Expected non-empty exerciseName, got "${prevPerf?.exerciseName}"`,
    );

    check(
      "getPreviousPerformance includes workoutDate",
      "R007",
      prevPerf !== null &&
        typeof prevPerf.workoutDate === "number" &&
        prevPerf.workoutDate > 0,
      `Expected workoutDate > 0, got ${prevPerf?.workoutDate}`,
    );

    check(
      "getPreviousPerformance includes workoutName",
      "R007",
      prevPerf !== null && prevPerf.workoutName === "R007 Completed Workout",
      `Expected workoutName "R007 Completed Workout", got "${prevPerf?.workoutName}"`,
    );

    // (b) Query previous performance for exercise B (never done in completed workout)
    const prevPerfNull = await client.query(
      api.testing.testGetPreviousPerformance,
      {
        testUserId: TEST_USER_ID,
        exerciseId: exerciseB._id,
      },
    );

    check(
      "getPreviousPerformance returns null for never-done exercise",
      "R007",
      prevPerfNull === null,
      `Expected null, got ${JSON.stringify(prevPerfNull)}`,
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
