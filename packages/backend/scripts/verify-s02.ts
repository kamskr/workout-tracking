#!/usr/bin/env npx tsx
/**
 * S02 End-to-End Verification Script
 *
 * Exercises the Convex workout lifecycle functions programmatically to verify:
 *   R002 — Workout CRUD (create, add exercises, log sets, finish, list, details, delete)
 *   R008 — Unit preference (set/get weight unit preference)
 *   R009 — Duration tracking (server-side durationSeconds computation)
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s02.ts
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

const TEST_USER_ID = "test-user-verify-s02";

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
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "── R009: Duration Tracking ──────────────────────────────\n",
    );

    // 1. Create workout, wait, finish, verify durationSeconds >= 1
    const durationWorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      {
        testUserId: TEST_USER_ID,
        name: "Duration Test",
      },
    );

    // Wait 2 seconds so duration is measurable
    await sleep(2000);

    const finishResult = await client.mutation(
      api.testing.testFinishWorkout,
      {
        testUserId: TEST_USER_ID,
        id: durationWorkoutId,
      },
    );

    check(
      "durationSeconds is computed server-side and >= 1",
      "R009",
      typeof finishResult.durationSeconds === "number" &&
        finishResult.durationSeconds >= 1,
      `Expected durationSeconds >= 1, got ${finishResult.durationSeconds}`,
    );

    check(
      "completedAt is set on finish",
      "R009",
      typeof finishResult.completedAt === "number" &&
        finishResult.completedAt > 0,
      `Expected completedAt > 0, got ${finishResult.completedAt}`,
    );

    // Clean up duration test workout
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: durationWorkoutId,
    });

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R002: Workout CRUD ───────────────────────────────────\n",
    );

    // 2. Get exercises to use
    const allExercises = await client.query(api.exercises.listExercises, {});
    check(
      "Exercise library has entries to use",
      "R002",
      allExercises.length >= 2,
      `Expected >= 2 exercises, got ${allExercises.length}`,
    );

    const exercise1 = allExercises[0]!;
    const exercise2 = allExercises[1]!;

    // 3. Create workout
    const workoutId = await client.mutation(
      api.testing.testCreateWorkout,
      {
        testUserId: TEST_USER_ID,
        name: "CRUD Test Workout",
      },
    );

    check(
      "Create workout returns ID",
      "R002",
      typeof workoutId === "string" && workoutId.length > 0,
      `Expected non-empty string ID, got ${typeof workoutId}`,
    );

    // 4. Add 2 exercises
    const we1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId,
      exerciseId: exercise1._id,
    });

    const we2Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId,
      exerciseId: exercise2._id,
    });

    check(
      "Add 2 exercises to workout",
      "R002",
      typeof we1Id === "string" &&
        we1Id.length > 0 &&
        typeof we2Id === "string" &&
        we2Id.length > 0,
      `Expected 2 workoutExercise IDs, got we1=${we1Id}, we2=${we2Id}`,
    );

    // 5. Log 3 sets on first exercise with weight/reps
    const set1Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1Id,
      weight: 60,
      reps: 10,
    });

    const set2Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1Id,
      weight: 65,
      reps: 8,
    });

    const set3Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1Id,
      weight: 70,
      reps: 6,
      isWarmup: false,
    });

    check(
      "Log 3 sets on first exercise",
      "R002",
      typeof set1Id === "string" &&
        typeof set2Id === "string" &&
        typeof set3Id === "string",
      `Expected 3 set IDs, got set1=${set1Id}, set2=${set2Id}, set3=${set3Id}`,
    );

    // 6. Finish workout (wait a moment so duration is > 0)
    await sleep(1000);

    const crudFinishResult = await client.mutation(
      api.testing.testFinishWorkout,
      {
        testUserId: TEST_USER_ID,
        id: workoutId,
      },
    );

    check(
      "Finish workout succeeds with duration",
      "R002",
      crudFinishResult.durationSeconds >= 0,
      `Expected durationSeconds >= 0, got ${crudFinishResult.durationSeconds}`,
    );

    // 7. Verify getWorkoutWithDetails returns joined data
    const details = await client.query(
      api.testing.testGetWorkoutWithDetails,
      {
        testUserId: TEST_USER_ID,
        id: workoutId,
      },
    );

    check(
      "getWorkoutWithDetails returns workout object",
      "R002",
      details.workout != null &&
        details.workout.name === "CRUD Test Workout" &&
        details.workout.status === "completed",
      `Expected completed workout named "CRUD Test Workout", got status=${details.workout?.status}, name=${details.workout?.name}`,
    );

    check(
      "getWorkoutWithDetails returns 2 exercises",
      "R002",
      details.exercises.length === 2,
      `Expected 2 exercises, got ${details.exercises.length}`,
    );

    // Check exercise names are joined
    const ex1Detail = details.exercises.find(
      (e: any) => e.workoutExercise._id === we1Id,
    );
    const ex2Detail = details.exercises.find(
      (e: any) => e.workoutExercise._id === we2Id,
    );

    check(
      "getWorkoutWithDetails joins exercise names",
      "R002",
      ex1Detail?.exercise?.name === exercise1.name &&
        ex2Detail?.exercise?.name === exercise2.name,
      `Expected exercise names "${exercise1.name}" and "${exercise2.name}", got "${ex1Detail?.exercise?.name}" and "${ex2Detail?.exercise?.name}"`,
    );

    check(
      "getWorkoutWithDetails returns 3 sets on first exercise",
      "R002",
      ex1Detail?.sets?.length === 3,
      `Expected 3 sets on first exercise, got ${ex1Detail?.sets?.length}`,
    );

    // 8. Verify listWorkouts includes this workout
    const workoutList = await client.query(api.testing.testListWorkouts, {
      testUserId: TEST_USER_ID,
    });

    const foundInList = workoutList.some((w: any) => w._id === workoutId);
    check(
      "listWorkouts includes the completed workout",
      "R002",
      foundInList,
      `Workout ${workoutId} not found in list of ${workoutList.length} workouts`,
    );

    // 9. Delete workout and verify it's gone
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: workoutId,
    });

    const afterDeleteList = await client.query(
      api.testing.testListWorkouts,
      {
        testUserId: TEST_USER_ID,
      },
    );

    const stillExists = afterDeleteList.some(
      (w: any) => w._id === workoutId,
    );
    check(
      "Deleted workout is removed from list",
      "R002",
      !stillExists,
      `Workout ${workoutId} still found in list after deletion`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R008: Unit Preference ────────────────────────────────\n",
    );

    // 10. Set preference to "lbs", verify
    await client.mutation(api.testing.testSetUnitPreference, {
      testUserId: TEST_USER_ID,
      unit: "lbs",
    });

    const prefsLbs = await client.query(api.testing.testGetPreferences, {
      testUserId: TEST_USER_ID,
    });

    check(
      'Set unit preference to "lbs" and read back',
      "R008",
      prefsLbs.weightUnit === "lbs",
      `Expected weightUnit "lbs", got "${prefsLbs.weightUnit}"`,
    );

    // 11. Set preference back to "kg", verify
    await client.mutation(api.testing.testSetUnitPreference, {
      testUserId: TEST_USER_ID,
      unit: "kg",
    });

    const prefsKg = await client.query(api.testing.testGetPreferences, {
      testUserId: TEST_USER_ID,
    });

    check(
      'Set unit preference to "kg" and read back',
      "R008",
      prefsKg.weightUnit === "kg",
      `Expected weightUnit "kg", got "${prefsKg.weightUnit}"`,
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
