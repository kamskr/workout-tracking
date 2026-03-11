#!/usr/bin/env npx tsx
/**
 * S01-M02 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify Personal Records detection:
 *   PR-01: Weight PR detected on first set (baseline)
 *   PR-02: Weight PR updated when a heavier estimated 1RM is logged
 *   PR-03: Volume PR detected when session total exceeds previous
 *   PR-04: Rep PR detected when single-set reps exceed previous
 *   PR-05: Warmup sets do not trigger PRs
 *   PR-06: Sets without weight skip weight/volume PR detection
 *   PR-07: PRs stored with correct setId, workoutId, achievedAt
 *   PR-08: getWorkoutPRs returns PRs for the correct workout only
 *   PR-09: getPersonalRecords returns current best per type
 *   PR-10: No false PR when set doesn't beat existing record
 *   PR-11: Volume PR running total includes all sets in exercise session
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s01-m02.ts
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

const TEST_USER_ID = "test-user-verify-s01-m02";

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
    const exerciseA = allExercises[0]!; // e.g. Bench Press (strength)
    const exerciseB = allExercises[1]!; // e.g. another exercise

    // ══════════════════════════════════════════════════════════════════════
    // Setup: create workout, add an exercise
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create workout with exercises ─────────────────\n");

    const workout1Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "PR Test Workout 1",
    });

    const we1A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: workout1Id,
      exerciseId: exerciseA._id,
    });

    const we1B = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: workout1Id,
      exerciseId: exerciseB._id,
    });

    console.log("  ✓ Workout 1 created with 2 exercises\n");

    // ══════════════════════════════════════════════════════════════════════
    // PR-01: Weight PR detected on first set (baseline)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── PR-01: Weight PR on first set (baseline) ────────────\n");

    const set1Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 80,
      reps: 8,
    });

    // Check if a weight PR was created for this exercise
    const prsAfterSet1 = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    const weightPr1 = prsAfterSet1.find((pr: any) => pr.type === "weight");
    check(
      "First set creates baseline weight PR",
      "PR-01",
      weightPr1 !== undefined,
      `Expected a weight PR for exercise A after first set, got ${prsAfterSet1.length} PRs: ${JSON.stringify(prsAfterSet1.map((p: any) => p.type))}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-02: Weight PR updated when heavier 1RM is logged
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-02: Weight PR updated on heavier 1RM ─────────────\n");

    // Epley: 80kg × 8 reps = 80 × (1 + 8/30) = 80 × 1.267 = 101.3
    // Epley: 100kg × 3 reps = 100 × (1 + 3/30) = 100 × 1.1 = 110.0
    const set2Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 100,
      reps: 3,
    });

    const prsAfterSet2 = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    const weightPr2 = prsAfterSet2.find((pr: any) => pr.type === "weight");
    // The updated weight PR should have a higher value (110 vs 101.3)
    check(
      "Weight PR updated to higher estimated 1RM",
      "PR-02",
      weightPr2 !== undefined && weightPr2.value > (weightPr1?.value ?? 0),
      `Expected weight PR value > ${weightPr1?.value ?? 0}, got ${weightPr2?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-03: Volume PR detected when session total exceeds previous
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-03: Volume PR on session total ───────────────────\n");

    // Volume so far: 80×8 + 100×3 = 640 + 300 = 940
    // This should be a baseline volume PR from the first/second set
    const volumePr3 = prsAfterSet2.find((pr: any) => pr.type === "volume");
    check(
      "Volume PR detected based on cumulative session volume",
      "PR-03",
      volumePr3 !== undefined && volumePr3.value > 0,
      `Expected a volume PR with value > 0, got ${volumePr3?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-04: Rep PR detected when single-set reps exceed previous
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-04: Rep PR on high-rep set ───────────────────────\n");

    // Log a set with more reps than any previous
    const set3Id = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1A,
      weight: 60,
      reps: 15,
    });

    const prsAfterSet3 = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    const repsPr3 = prsAfterSet3.find((pr: any) => pr.type === "reps");
    check(
      "Rep PR detected for highest single-set reps",
      "PR-04",
      repsPr3 !== undefined && repsPr3.value >= 15,
      `Expected reps PR >= 15, got ${repsPr3?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-05: Warmup sets do not trigger PRs
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-05: Warmup sets skip PR detection ────────────────\n");

    // Use exerciseB (no PRs yet). Log a warmup set with high weight.
    const warmupSetId = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1B,
      weight: 200,
      reps: 5,
      isWarmup: true,
    });

    const prsAfterWarmup = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseB._id,
    });

    check(
      "Warmup set does not create any PRs",
      "PR-05",
      prsAfterWarmup.length === 0,
      `Expected 0 PRs for exercise B after warmup, got ${prsAfterWarmup.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-06: Sets without weight skip weight/volume PR detection
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-06: Sets without weight skip weight/volume PR ────\n");

    // Log a set with no weight (bodyweight exercise usage)
    const noWeightSetId = await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we1B,
      reps: 20,
    });

    const prsAfterNoWeight = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseB._id,
    });

    // Should have at most a reps PR (no weight or volume PR)
    const weightPrB = prsAfterNoWeight.find((pr: any) => pr.type === "weight");
    const volumePrB = prsAfterNoWeight.find((pr: any) => pr.type === "volume");
    check(
      "Set without weight does not create weight or volume PR",
      "PR-06",
      weightPrB === undefined && volumePrB === undefined,
      `Expected no weight/volume PRs, got weight=${weightPrB?.value ?? "none"}, volume=${volumePrB?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-07: PRs stored with correct setId, workoutId, achievedAt
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-07: PR metadata (setId, workoutId, achievedAt) ───\n");

    const allPrsA = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    const hasCorrectMeta = allPrsA.every(
      (pr: any) =>
        pr.setId !== undefined &&
        pr.workoutId === workout1Id &&
        typeof pr.achievedAt === "number" &&
        pr.achievedAt > 0,
    );

    check(
      "All PRs have valid setId, correct workoutId, and numeric achievedAt",
      "PR-07",
      allPrsA.length > 0 && hasCorrectMeta,
      `Expected all PRs to have correct metadata. Got ${allPrsA.length} PRs, allCorrect=${hasCorrectMeta}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-08: getWorkoutPRs returns PRs for the correct workout only
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-08: getWorkoutPRs filters by workout ─────────────\n");

    const workout1Prs = await client.query(api.testing.testGetWorkoutPRs, {
      testUserId: TEST_USER_ID,
      workoutId: workout1Id,
    });

    // All PRs should belong to workout1
    const allFromWorkout1 = workout1Prs.every(
      (pr: any) => pr.workoutId === workout1Id,
    );

    check(
      "getWorkoutPRs returns only PRs for the specified workout",
      "PR-08",
      workout1Prs.length > 0 && allFromWorkout1,
      `Expected PRs all from workout1, got ${workout1Prs.length} PRs, allFromWorkout1=${allFromWorkout1}`,
    );

    // Create a second workout and verify it has no PRs
    const workout2Id = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USER_ID,
      name: "PR Test Workout 2",
    });

    const workout2Prs = await client.query(api.testing.testGetWorkoutPRs, {
      testUserId: TEST_USER_ID,
      workoutId: workout2Id,
    });

    check(
      "getWorkoutPRs returns empty for workout with no PRs",
      "PR-08b",
      workout2Prs.length === 0,
      `Expected 0 PRs for workout2, got ${workout2Prs.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-09: getPersonalRecords returns current best per type
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-09: getPersonalRecords returns current bests ─────\n");

    const personalRecordsA = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    // Should have weight, volume, and reps PRs for exerciseA
    const prTypes = personalRecordsA.map((pr: any) => pr.type).sort();
    check(
      "getPersonalRecords returns all PR types for exercise",
      "PR-09",
      prTypes.includes("weight") && prTypes.includes("volume") && prTypes.includes("reps"),
      `Expected weight, volume, reps PRs, got types: ${JSON.stringify(prTypes)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-10: No false PR when set doesn't beat existing record
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-10: No false PR on weaker set ────────────────────\n");

    // Add exercise A to workout 2 and log a weak set
    const we2A = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_ID,
      workoutId: workout2Id,
      exerciseId: exerciseA._id,
    });

    // Log a set weaker than existing PRs
    // Current weight PR based on 100kg × 3 = 110 est 1RM
    // This set: 50kg × 5 = 50 × (1 + 5/30) = 58.3 est 1RM — weaker
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_ID,
      workoutExerciseId: we2A,
      weight: 50,
      reps: 5,
    });

    // Verify the weight PR wasn't updated (still points to workout1)
    const prsAfterWeak = await client.query(api.testing.testGetPersonalRecords, {
      testUserId: TEST_USER_ID,
      exerciseId: exerciseA._id,
    });

    const weightPrAfterWeak = prsAfterWeak.find((pr: any) => pr.type === "weight");
    check(
      "Weaker set does not update existing weight PR",
      "PR-10",
      weightPrAfterWeak !== undefined && weightPrAfterWeak.workoutId === workout1Id,
      `Expected weight PR still from workout1, got workoutId=${weightPrAfterWeak?.workoutId ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // PR-11: Volume PR running total includes all sets in exercise session
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── PR-11: Volume PR covers all session sets ────────────\n");

    // Volume from workout 1 exerciseA: 80×8 + 100×3 + 60×15 = 640 + 300 + 900 = 1840
    // Volume from workout 2 exerciseA so far: 50×5 = 250 (doesn't beat 1840)
    const volumePrAfterWeak = prsAfterWeak.find((pr: any) => pr.type === "volume");
    check(
      "Volume PR reflects cumulative session volume, not single set",
      "PR-11",
      volumePrAfterWeak !== undefined && volumePrAfterWeak.value >= 940,
      `Expected volume PR >= 940 (from workout1 cumulative), got ${volumePrAfterWeak?.value ?? "none"}`,
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
    // Exit 1 only if this is supposed to be a passing run
    // For T01, checks are expected to fail since PR detection isn't implemented yet
    process.exit(1);
  }

  console.log("  All checks passed! ✅\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(2);
});
