#!/usr/bin/env npx tsx
/**
 * S05 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify workout template functions (R006):
 *   R006-1: Save completed workout as template
 *   R006-2: List templates returns saved template
 *   R006-3: Get template with exercises — correct targetSets and targetReps
 *   R006-4: Start workout from template — exercises pre-filled, no sets
 *   R006-5: Reject save from non-completed workout
 *   R006-6: Reject save from empty workout (0 exercises)
 *   R006-7: Reject start when active workout exists
 *   R006-8: Delete template — cascade removes template exercises
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s05.ts
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

const TEST_USER_ID = "test-user-verify-s05";

async function expectError(
  fn: () => Promise<unknown>,
  expectedSubstring: string,
): Promise<boolean> {
  try {
    await fn();
    return false; // should have thrown
  } catch (err: any) {
    const msg: string = err.message ?? String(err);
    return msg.includes(expectedSubstring);
  }
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
    // Setup: create workout, add 2 exercises, log sets, finish
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create and complete a workout ─────────────────\n");

    const workoutId = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "Template Source Workout",
    });

    const weA = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId,
      exerciseId: exerciseA._id,
    });
    const weB = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId,
      exerciseId: exerciseB._id,
    });

    // Exercise A: 3 sets (60kg×10, 65kg×8, 70kg×6)
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: weA,
      weight: 60,
      reps: 10,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: weA,
      weight: 65,
      reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: weA,
      weight: 70,
      reps: 6,
    });

    // Exercise B: 2 sets (20kg×12, 22kg×10)
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: weB,
      weight: 20,
      reps: 12,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: weB,
      weight: 22,
      reps: 10,
    });

    // Finish workout
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: workoutId,
    });

    console.log("  ✓ Workout created, exercises added, sets logged, finished\n");

    // ══════════════════════════════════════════════════════════════════════
    console.log("── R006-1: Save as template ─────────────────────────────\n");

    const templateId = await client.mutation(api.testing.testSaveAsTemplate, {
      testUserId: TEST_USER_ID,
      workoutId,
      name: "My Push Day",
      description: "A solid push workout",
    });

    check(
      "Save as template returns a template ID",
      "R006-1",
      typeof templateId === "string" && templateId.length > 0,
      `Expected non-empty template ID, got ${templateId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── R006-2: List templates ───────────────────────────────\n");

    const templates = await client.query(api.testing.testListTemplates, {
      testUserId: TEST_USER_ID,
    });

    check(
      "List templates includes saved template",
      "R006-2",
      templates.length === 1 && templates[0]!.name === "My Push Day",
      `Expected 1 template named "My Push Day", got ${templates.length} templates${templates.length > 0 ? ` (first: "${templates[0]!.name}")` : ""}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R006-3: Get template with exercises ──────────────────\n",
    );

    const detail = await client.query(
      api.testing.testGetTemplateWithExercises,
      {
        testUserId: TEST_USER_ID,
        templateId,
      },
    );

    const exCount = detail.exercises.length;
    const ex0 = detail.exercises[0];
    const ex1 = detail.exercises[1];

    check(
      "Template has 2 exercises with correct targetSets and targetReps",
      "R006-3",
      exCount === 2 &&
        ex0?.templateExercise.targetSets === 3 &&
        ex0?.templateExercise.targetReps === 10 &&
        ex1?.templateExercise.targetSets === 2 &&
        ex1?.templateExercise.targetReps === 12,
      `Expected 2 exercises (targetSets:3/2, targetReps:10/12), got ${exCount} exercises` +
        (exCount >= 1
          ? ` (ex0: sets=${ex0?.templateExercise.targetSets} reps=${ex0?.templateExercise.targetReps})`
          : "") +
        (exCount >= 2
          ? ` (ex1: sets=${ex1?.templateExercise.targetSets} reps=${ex1?.templateExercise.targetReps})`
          : ""),
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R006-4: Start workout from template ──────────────────\n",
    );

    const newWorkoutId = await client.mutation(
      api.testing.testStartFromTemplate,
      {
        testUserId: TEST_USER_ID,
        templateId,
      },
    );

    const newWorkoutDetails = await client.query(
      api.testing.testGetWorkoutWithDetails,
      {
        testUserId: TEST_USER_ID,
        id: newWorkoutId,
      },
    );

    const nwExercises = newWorkoutDetails.exercises;
    const hasNoSets = nwExercises.every(
      (e: any) => e.sets.length === 0,
    );
    const correctOrder =
      nwExercises.length === 2 &&
      nwExercises[0]!.workoutExercise.order === 0 &&
      nwExercises[1]!.workoutExercise.order === 1;

    check(
      "Start from template creates workout with 2 exercises, correct order, no sets",
      "R006-4",
      nwExercises.length === 2 && hasNoSets && correctOrder,
      `Got ${nwExercises.length} exercises, noSets=${hasNoSets}, correctOrder=${correctOrder}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R006-5: Reject save from non-completed workout ──────\n",
    );

    // Create an in-progress workout (the one from T4 is still active, but let's use a fresh one)
    // First, finish the T4 workout so we can make a clean new one
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: newWorkoutId,
    });

    const inProgressId = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "Not Yet Done",
    });

    // Add an exercise so it's not empty
    await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: inProgressId,
      exerciseId: exerciseA._id,
    });

    const rejectedNonCompleted = await expectError(
      () =>
        client.mutation(api.testing.testSaveAsTemplate, {
          testUserId: TEST_USER_ID,
          workoutId: inProgressId,
          name: "Should Fail",
        }),
      "not completed",
    );

    check(
      "Reject save from non-completed workout",
      "R006-5",
      rejectedNonCompleted,
      "Expected error containing 'not completed'",
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R006-6: Reject save from empty workout ───────────────\n",
    );

    // Finish the in-progress workout first (it has an exercise, so make a new empty one)
    // Delete the in-progress workout and create a fresh one with no exercises
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: inProgressId,
    });

    const emptyWorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      {
        testUserId: TEST_USER_ID,
        name: "Empty Workout",
      },
    );

    // Finish it immediately (no exercises added)
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USER_ID,
      id: emptyWorkoutId,
    });

    const rejectedEmpty = await expectError(
      () =>
        client.mutation(api.testing.testSaveAsTemplate, {
          testUserId: TEST_USER_ID,
          workoutId: emptyWorkoutId,
          name: "Should Fail Too",
        }),
      "no exercises",
    );

    check(
      "Reject save from empty workout (0 exercises)",
      "R006-6",
      rejectedEmpty,
      "Expected error containing 'no exercises'",
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── R006-7: Reject start when active workout exists ─────\n",
    );

    // Create an active workout
    const activeId = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "Active Blocker",
    });

    const rejectedActiveConflict = await expectError(
      () =>
        client.mutation(api.testing.testStartFromTemplate, {
          testUserId: TEST_USER_ID,
          templateId,
        }),
      "already have an active workout",
    );

    check(
      "Reject start from template when active workout exists",
      "R006-7",
      rejectedActiveConflict,
      "Expected error containing 'already have an active workout'",
    );

    // Clean up the active blocker
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USER_ID,
      id: activeId,
    });

    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── R006-8: Delete template ──────────────────────────────\n");

    await client.mutation(api.testing.testDeleteTemplate, {
      testUserId: TEST_USER_ID,
      templateId,
    });

    const templatesAfterDelete = await client.query(
      api.testing.testListTemplates,
      {
        testUserId: TEST_USER_ID,
      },
    );

    check(
      "Delete template removes template and list is empty",
      "R006-8",
      templatesAfterDelete.length === 0,
      `Expected 0 templates after delete, got ${templatesAfterDelete.length}`,
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
