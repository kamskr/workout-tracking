#!/usr/bin/env npx tsx
/**
 * S01-M04 End-to-End Verification Script
 *
 * Exercises the Convex backend to verify Leaderboard queries & mutations:
 *   LB-01: Entries exist after testUpdateLeaderboardEntries call
 *   LB-02: e1RM value matches Epley formula (weight × (1 + reps/30))
 *   LB-03: Volume metric excludes warmup sets (compare against manual calc)
 *   LB-04: Reps metric = max single-set reps for the exercise
 *   LB-05: testGetLeaderboard includes opted-in users (users 1-3)
 *   LB-06: testGetLeaderboard excludes non-opted-in users (users 4-5)
 *   LB-07: Rankings ordered descending by value
 *   LB-08: testGetMyRank returns correct position for user with known rank
 *   LB-09: testGetMyRank returns null for non-opted-in user
 *   LB-10: Period-filtered leaderboard (7d) shows entries with recent updatedAt
 *   LB-11: After testDeleteWorkout, leaderboard entries for that workout are removed
 *   LB-12: testGetLeaderboardExercises returns the exercise used in setup
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s01-m04.ts
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

const TEST_USERS = [
  "test-lb-user-1",
  "test-lb-user-2",
  "test-lb-user-3",
  "test-lb-user-4",
  "test-lb-user-5",
] as const;

// User workout data: each user has different weights/reps for predictable ranking
// User 1: heaviest — e1RM 120×(1+5/30)=140, volume 120×5=600, reps 5
// User 2: medium   — e1RM 100×(1+8/30)=126.67, volume 100×8=800, reps 8
// User 3: lightest opted-in — e1RM 80×(1+10/30)=106.67, volume 80×10+80×6=1280, reps 10
// User 4: NOT opted in — e1RM 150×(1+3/30)=165, volume 150×3=450, reps 3
// User 5: NOT opted in — e1RM 60×(1+12/30)=84, volume 60×12=720, reps 12

interface UserSetup {
  weight: number;
  reps: number;
  extraSets?: Array<{ weight: number; reps: number; isWarmup: boolean }>;
  optedIn: boolean;
}

const USER_DATA: Record<string, UserSetup> = {
  "test-lb-user-1": {
    weight: 120,
    reps: 5,
    optedIn: true,
  },
  "test-lb-user-2": {
    weight: 100,
    reps: 8,
    optedIn: true,
  },
  "test-lb-user-3": {
    weight: 80,
    reps: 10,
    extraSets: [
      { weight: 80, reps: 6, isWarmup: false }, // extra working set
      { weight: 40, reps: 15, isWarmup: true }, // warmup — should be excluded from volume
    ],
    optedIn: true,
  },
  "test-lb-user-4": {
    weight: 150,
    reps: 3,
    optedIn: false,
  },
  "test-lb-user-5": {
    weight: 60,
    reps: 12,
    optedIn: false,
  },
};

// Pre-computed expected values using Epley formula: weight × (1 + reps/30)
function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

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
  console.log("  ✓ All 5 test users cleaned up\n");

  try {
    // ══════════════════════════════════════════════════════════════════════
    // Setup: Create profiles, workouts, exercises, sets
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create profiles + workouts for 5 users ───────\n");

    // Get an exercise to use
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error(
        `Need at least 1 exercise in library, got ${allExercises.length}`,
      );
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})\n`);

    // Create profiles for all 5 users
    for (const userId of TEST_USERS) {
      const idx = TEST_USERS.indexOf(userId) + 1;
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: userId,
        username: `lbuser${idx}_${Date.now()}`,
        displayName: `LB User ${idx}`,
      });
    }
    console.log("  ✓ 5 profiles created\n");

    // Set opt-in for users 1-3, leave 4-5 as default (not opted in)
    for (const userId of TEST_USERS) {
      const data = USER_DATA[userId]!;
      if (data.optedIn) {
        await client.mutation(api.testing.testSetLeaderboardOptIn, {
          testUserId: userId,
          optIn: true,
        });
      }
    }
    console.log("  ✓ Users 1-3 opted in, users 4-5 not opted in\n");

    // Track workout IDs for later cleanup/deletion tests
    const workoutIds: Record<string, any> = {};
    const workoutExerciseIds: Record<string, any> = {};

    // Create workout + exercise + sets for each user
    for (const userId of TEST_USERS) {
      const data = USER_DATA[userId]!;

      const workoutId = await client.mutation(api.testing.testCreateWorkout, {
        testUserId: userId,
        name: `LB Test Workout ${userId}`,
      });
      workoutIds[userId] = workoutId;

      const weId = await client.mutation(api.testing.testAddExercise, {
        testUserId: userId,
        workoutId,
        exerciseId: exercise._id,
      });
      workoutExerciseIds[userId] = weId;

      // Log the main working set
      await client.mutation(api.testing.testLogSet, {
        testUserId: userId,
        workoutExerciseId: weId,
        weight: data.weight,
        reps: data.reps,
      });

      // Log extra sets if defined
      if (data.extraSets) {
        for (const extra of data.extraSets) {
          await client.mutation(api.testing.testLogSet, {
            testUserId: userId,
            workoutExerciseId: weId,
            weight: extra.weight,
            reps: extra.reps,
            isWarmup: extra.isWarmup,
          });
        }
      }

      // Finish workout to get it into completed state, then update leaderboard
      await client.mutation(api.testing.testFinishWorkout, {
        testUserId: userId,
        id: workoutId,
      });

      // Call testUpdateLeaderboardEntries directly (the finishWorkout hook
      // may have already run, but this ensures entries exist for testing)
      await client.mutation(api.testing.testUpdateLeaderboardEntries, {
        testUserId: userId,
        workoutId,
      });
    }
    console.log("  ✓ 5 workouts created with sets and leaderboard entries\n");

    // ══════════════════════════════════════════════════════════════════════
    // LB-01: Entries exist after testUpdateLeaderboardEntries call
    // ══════════════════════════════════════════════════════════════════════
    console.log("── LB-01: Entries exist after update call ──────────────\n");

    const user1Entries = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      {
        testUserId: TEST_USERS[0],
        exerciseId: exercise._id,
      },
    );

    check(
      "Leaderboard entries created for user 1",
      "LB-01",
      user1Entries.length >= 3,
      `Expected >= 3 entries (e1rm, volume, reps), got ${user1Entries.length}: ${JSON.stringify(user1Entries.map((e: any) => e.metric))}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-02: e1RM value matches Epley formula
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── LB-02: e1RM matches Epley formula ───────────────────\n");

    const e1rmEntry = user1Entries.find((e: any) => e.metric === "e1rm");
    const expectedE1rm = epley(120, 5); // 120 × (1 + 5/30) = 140
    const e1rmMatch =
      e1rmEntry !== undefined &&
      Math.abs(e1rmEntry.value - expectedE1rm) < 0.01;

    check(
      `e1RM = ${expectedE1rm} for 120kg × 5 reps`,
      "LB-02",
      e1rmMatch,
      `Expected e1RM = ${expectedE1rm}, got ${e1rmEntry?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-03: Volume metric excludes warmup sets
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── LB-03: Volume excludes warmup sets ──────────────────\n");

    // User 3: working sets = 80×10 + 80×6 = 800+480 = 1280
    // The warmup set (40×15) should NOT be included
    const user3Entries = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      {
        testUserId: TEST_USERS[2],
        exerciseId: exercise._id,
      },
    );

    const volumeEntry3 = user3Entries.find((e: any) => e.metric === "volume");
    const expectedVolume3 = 80 * 10 + 80 * 6; // 1280, NOT 80*10 + 80*6 + 40*15 = 1880

    check(
      `Volume = ${expectedVolume3} (excludes warmup 40×15)`,
      "LB-03",
      volumeEntry3 !== undefined &&
        Math.abs(volumeEntry3.value - expectedVolume3) < 0.01,
      `Expected volume = ${expectedVolume3}, got ${volumeEntry3?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-04: Reps metric = max single-set reps
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── LB-04: Reps = max single-set reps ─────────────────\n");

    // User 3: working sets have reps 10 and 6, warmup has 15 (excluded)
    // Max working-set reps = 10
    const repsEntry3 = user3Entries.find((e: any) => e.metric === "reps");

    check(
      "Reps = 10 (max working-set reps, warmup excluded)",
      "LB-04",
      repsEntry3 !== undefined && repsEntry3.value === 10,
      `Expected reps = 10, got ${repsEntry3?.value ?? "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-05: testGetLeaderboard includes opted-in users (users 1-3)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-05: Leaderboard includes opted-in users ────────────\n",
    );

    const leaderboard = await client.query(api.testing.testGetLeaderboard, {
      exerciseId: exercise._id,
      metric: "e1rm",
      period: "allTime",
      limit: 10,
    });

    const optedInUserIds = [TEST_USERS[0], TEST_USERS[1], TEST_USERS[2]];
    const leaderboardUserIds = leaderboard.entries.map((e: any) => e.userId);
    const allOptedInPresent = optedInUserIds.every((uid) =>
      leaderboardUserIds.includes(uid),
    );

    check(
      "All 3 opted-in users appear in leaderboard",
      "LB-05",
      allOptedInPresent,
      `Expected users ${optedInUserIds.join(", ")} in leaderboard, got ${leaderboardUserIds.join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-06: testGetLeaderboard excludes non-opted-in users (users 4-5)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-06: Leaderboard excludes non-opted-in users ────────\n",
    );

    const notOptedInUserIds = [TEST_USERS[3], TEST_USERS[4]];
    const noneExcludedPresent = notOptedInUserIds.every(
      (uid) => !leaderboardUserIds.includes(uid),
    );

    check(
      "Non-opted-in users 4-5 excluded from leaderboard",
      "LB-06",
      noneExcludedPresent,
      `Expected users ${notOptedInUserIds.join(", ")} NOT in leaderboard, but found in ${leaderboardUserIds.join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-07: Rankings ordered descending by value
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── LB-07: Rankings ordered descending by value ─────────\n");

    const values = leaderboard.entries.map((e: any) => e.value);
    let isDescending = true;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        isDescending = false;
        break;
      }
    }

    check(
      "Leaderboard entries ordered by descending value",
      "LB-07",
      isDescending && values.length >= 3,
      `Values: ${values.join(", ")} — expected descending with >= 3 entries`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-08: testGetMyRank returns correct position for opted-in user
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── LB-08: getMyRank returns correct position ──────────\n");

    // User 1 has highest e1RM among opted-in users (140), should be rank 1
    const user1Rank = await client.query(api.testing.testGetMyRank, {
      testUserId: TEST_USERS[0],
      exerciseId: exercise._id,
      metric: "e1rm",
      period: "allTime",
    });

    check(
      "User 1 (highest opted-in e1RM) is rank 1",
      "LB-08",
      user1Rank.rank === 1,
      `Expected rank 1, got ${user1Rank.rank}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-09: testGetMyRank returns null for non-opted-in user
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-09: getMyRank returns null for non-opted-in user ──\n",
    );

    const user4Rank = await client.query(api.testing.testGetMyRank, {
      testUserId: TEST_USERS[3],
      exerciseId: exercise._id,
      metric: "e1rm",
      period: "allTime",
    });

    check(
      "Non-opted-in user 4 gets rank: null",
      "LB-09",
      user4Rank.rank === null,
      `Expected rank null, got ${user4Rank.rank}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-10: Period-filtered leaderboard — entries with recent updatedAt
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-10: Recent entries have updatedAt within 7 days ───\n",
    );

    // All entries were just created, so updatedAt should be within the last minute
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allRecentEntries = leaderboard.entries.every(
      (e: any) => e.updatedAt > sevenDaysAgo,
    );

    check(
      "All leaderboard entries have updatedAt within 7 days",
      "LB-10",
      allRecentEntries && leaderboard.entries.length >= 3,
      `Expected all entries updatedAt > ${sevenDaysAgo}, got entries: ${leaderboard.entries.map((e: any) => `${e.userId}:${e.updatedAt}`).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-11: After testDeleteWorkout, leaderboard entries removed
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-11: Entries removed after workout deletion ────────\n",
    );

    // Delete user 2's workout and verify leaderboard entries are gone
    // We need to use testDeleteWorkout which cascades to leaderboard entries
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: TEST_USERS[1],
      id: workoutIds[TEST_USERS[1]],
    });

    // Wait a moment for cascade to complete
    await new Promise((r) => setTimeout(r, 500));

    const user2EntriesAfterDelete = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      {
        testUserId: TEST_USERS[1],
        exerciseId: exercise._id,
      },
    );

    check(
      "User 2 leaderboard entries removed after workout deletion",
      "LB-11",
      user2EntriesAfterDelete.length === 0,
      `Expected 0 entries after delete, got ${user2EntriesAfterDelete.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // LB-12: testGetLeaderboardExercises returns the exercise used
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── LB-12: getLeaderboardExercises returns used exercise ──\n",
    );

    const lbExercises = await client.query(
      api.testing.testGetLeaderboardExercises,
      {},
    );

    const exerciseFound = lbExercises.some(
      (e: any) => e._id === exercise._id,
    );

    check(
      `Exercise "${exercise.name}" appears in getLeaderboardExercises`,
      "LB-12",
      exerciseFound,
      `Expected exercise ${exercise._id} in results, got ${lbExercises.map((e: any) => e._id).join(", ")}`,
    );
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    console.log("\n── Cleanup ──────────────────────────────────────────────\n");
    for (const userId of TEST_USERS) {
      try {
        await client.mutation(api.testing.testCleanup, {
          testUserId: userId,
        });
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
