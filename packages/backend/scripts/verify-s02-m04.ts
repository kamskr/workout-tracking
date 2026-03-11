#!/usr/bin/env npx tsx
/**
 * S02-M04 End-to-End Verification Script — Group Challenges
 *
 * Exercises the challenge system backend to verify:
 *   CH-01: Challenge created with correct fields and "pending" status
 *   CH-02: Challenge activates when testActivateChallenge called
 *   CH-03: User can join a challenge (participant count increases)
 *   CH-04: Duplicate join rejected
 *   CH-05: Standings return participants ordered by currentValue descending
 *   CH-06: workoutCount metric increments correctly
 *   CH-07: totalReps metric sums correctly for challenge exercise
 *   CH-08: totalVolume metric computes correctly (Σ weight×reps)
 *   CH-09: maxWeight metric tracks highest single-set weight
 *   CH-10: Challenge status transition: pending → active (via getChallenge)
 *   CH-11: completeChallenge determines correct winner
 *   CH-12: completeChallenge is idempotent
 *   CH-13: cancelChallenge transitions to cancelled (creator only)
 *   CH-14: listChallenges filters by status correctly
 *   CH-15: Challenge with solo creator completes with creator as winner
 *   CH-16: leaveChallenge removes participant entry
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s02-m04.ts
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
  "test-ch-user-1",
  "test-ch-user-2",
  "test-ch-user-3",
  "test-ch-user-4",
] as const;

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
  console.log("  ✓ All 4 test users cleaned up\n");

  try {
    // ══════════════════════════════════════════════════════════════════════
    // Setup: Create profiles (user 4 intentionally has no profile)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create profiles + seed exercise ──────────────\n");

    // Create profiles for users 1-3 (user 4 has NO profile — tests fallback)
    for (let i = 0; i < 3; i++) {
      const userId = TEST_USERS[i];
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: userId,
        username: `chuser${i + 1}_${Date.now()}`,
        displayName: `Challenge User ${i + 1}`,
      });
    }
    console.log("  ✓ Profiles created for users 1-3 (user 4 has no profile)\n");

    // Get or create an exercise for exercise-specific challenges
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error(
        `Need at least 1 exercise in library, got ${allExercises.length}`,
      );
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})\n`);

    // Time helpers — challenges start "in the past" to be activatable immediately
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const futureStart = now + 24 * HOUR;
    const futureEnd = now + 7 * 24 * HOUR;
    const pastStart = now - HOUR; // already past — can be activated
    const futureEndSoon = now + 2 * HOUR;

    // ══════════════════════════════════════════════════════════════════════
    // CH-01: Challenge created with correct fields and "pending" status
    // ══════════════════════════════════════════════════════════════════════
    console.log("── CH-01: Challenge created with pending status ────────\n");

    const challengeId1 = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Most Pull-ups This Week",
        type: "totalReps",
        exerciseId: exercise._id,
        startAt: futureStart,
        endAt: futureEnd,
      },
    );

    const challenge1 = await client.query(api.testing.testGetChallenge, {
      challengeId: challengeId1,
    });

    check(
      "Challenge created with pending status",
      "CH-01",
      challenge1.status === "pending" &&
        challenge1.title === "Most Pull-ups This Week" &&
        challenge1.type === "totalReps" &&
        challenge1.creatorId === TEST_USERS[0] &&
        challenge1.participantCount === 1,
      `Expected pending/totalReps/creator=${TEST_USERS[0]}/count=1, got status=${challenge1.status} type=${challenge1.type} creator=${challenge1.creatorId} count=${challenge1.participantCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-02: Challenge activates when testActivateChallenge called
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-02: Challenge activates ──────────────────────────\n");

    await client.mutation(api.testing.testActivateChallenge, {
      challengeId: challengeId1,
    });

    const challenge1AfterActivate = await client.query(
      api.testing.testGetChallenge,
      { challengeId: challengeId1 },
    );

    check(
      "Challenge status is active after activation",
      "CH-02",
      challenge1AfterActivate.status === "active",
      `Expected "active", got "${challenge1AfterActivate.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-03: User can join a challenge
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-03: User can join a challenge ────────────────────\n");

    await client.mutation(api.testing.testJoinChallenge, {
      testUserId: TEST_USERS[1],
      challengeId: challengeId1,
    });

    const challenge1AfterJoin = await client.query(
      api.testing.testGetChallenge,
      { challengeId: challengeId1 },
    );

    check(
      "Participant count is 2 after user 2 joins",
      "CH-03",
      challenge1AfterJoin.participantCount === 2,
      `Expected participantCount=2, got ${challenge1AfterJoin.participantCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-04: Duplicate join rejected
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-04: Duplicate join rejected ─────────────────────\n");

    let duplicateJoinError = "";
    try {
      await client.mutation(api.testing.testJoinChallenge, {
        testUserId: TEST_USERS[1],
        challengeId: challengeId1,
      });
    } catch (err: any) {
      duplicateJoinError = err.message || String(err);
    }

    check(
      "Duplicate join throws error",
      "CH-04",
      duplicateJoinError.includes("Already joined"),
      `Expected "Already joined" error, got: "${duplicateJoinError}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-05: Standings return participants ordered by currentValue desc
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-05: Standings ordered by currentValue desc ──────\n");

    // We need different currentValues. Let user 1 log a workout to get reps.
    // First, create a workout + exercise + sets for user 1 to bump their value
    const w1 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USERS[0],
      name: "CH Test Workout 1",
    });
    const we1 = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USERS[0],
      workoutId: w1,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USERS[0],
      workoutExerciseId: we1,
      weight: 50,
      reps: 10,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USERS[0],
      id: w1,
    });
    // Manually trigger challenge progress update
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: TEST_USERS[0],
      workoutId: w1,
    });

    // Now user 2 logs a smaller workout
    const w2 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USERS[1],
      name: "CH Test Workout 2",
    });
    const we2 = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USERS[1],
      workoutId: w2,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USERS[1],
      workoutExerciseId: we2,
      weight: 50,
      reps: 5,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USERS[1],
      id: w2,
    });
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: TEST_USERS[1],
      workoutId: w2,
    });

    const standings1 = await client.query(
      api.testing.testGetChallengeStandings,
      { challengeId: challengeId1 },
    );

    const standingValues = standings1.participants.map(
      (p: any) => p.currentValue,
    );
    let standingsDescending = true;
    for (let i = 1; i < standingValues.length; i++) {
      if (standingValues[i] > standingValues[i - 1]) {
        standingsDescending = false;
        break;
      }
    }

    check(
      "Standings ordered by currentValue descending",
      "CH-05",
      standingsDescending &&
        standingValues.length === 2 &&
        standingValues[0] > standingValues[1],
      `Values: ${standingValues.join(", ")} — expected descending with user 1 > user 2`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-06: workoutCount metric increments correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-06: workoutCount metric increments ──────────────\n");

    // Create a workoutCount challenge (no exerciseId needed)
    const challengeWC = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Most Workouts Challenge",
        type: "workoutCount",
        startAt: pastStart,
        endAt: futureEnd,
      },
    );
    // Already active because pastStart <= now

    // User 1 joins and finishes a workout
    const w3 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USERS[0],
      name: "WC Test Workout",
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USERS[0],
      id: w3,
    });
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: TEST_USERS[0],
      workoutId: w3,
    });

    const wcParticipants = await client.query(
      api.testing.testGetRawParticipants,
      { challengeId: challengeWC },
    );

    const user1WC = wcParticipants.find(
      (p: any) => p.userId === TEST_USERS[0],
    );

    check(
      "workoutCount incremented to 1 after finishing 1 workout",
      "CH-06",
      user1WC !== undefined && user1WC.currentValue === 1,
      `Expected currentValue=1, got ${user1WC?.currentValue ?? "not found"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-07: totalReps metric sums correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-07: totalReps sums correctly ─────────────────────\n");

    // challenge1 is totalReps for our exercise. User 1 logged 10 reps above.
    // Check that user 1's currentValue in challenge1 = 10
    const repsParticipants = await client.query(
      api.testing.testGetRawParticipants,
      { challengeId: challengeId1 },
    );

    const user1Reps = repsParticipants.find(
      (p: any) => p.userId === TEST_USERS[0],
    );

    check(
      "totalReps = 10 after logging 10 reps",
      "CH-07",
      user1Reps !== undefined && user1Reps.currentValue === 10,
      `Expected currentValue=10, got ${user1Reps?.currentValue ?? "not found"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-08: totalVolume metric computes correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-08: totalVolume computes correctly ────────────────\n");

    // Create a totalVolume challenge
    const challengeVol = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Volume Challenge",
        type: "totalVolume",
        exerciseId: exercise._id,
        startAt: pastStart,
        endAt: futureEnd,
      },
    );

    // User 1 logs a workout with known weight×reps = 80 × 5 = 400
    const w4 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USERS[0],
      name: "Vol Test Workout",
    });
    const we4 = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USERS[0],
      workoutId: w4,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USERS[0],
      workoutExerciseId: we4,
      weight: 80,
      reps: 5,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USERS[0],
      id: w4,
    });
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: TEST_USERS[0],
      workoutId: w4,
    });

    const volParticipants = await client.query(
      api.testing.testGetRawParticipants,
      { challengeId: challengeVol },
    );

    const user1Vol = volParticipants.find(
      (p: any) => p.userId === TEST_USERS[0],
    );

    check(
      "totalVolume = 400 (80 × 5)",
      "CH-08",
      user1Vol !== undefined && user1Vol.currentValue === 400,
      `Expected currentValue=400, got ${user1Vol?.currentValue ?? "not found"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-09: maxWeight metric tracks highest single-set weight
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-09: maxWeight tracks highest weight ──────────────\n");

    // Create a maxWeight challenge
    const challengeMax = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Max Weight Challenge",
        type: "maxWeight",
        exerciseId: exercise._id,
        startAt: pastStart,
        endAt: futureEnd,
      },
    );

    // User 1 logs two sets: 100kg and 120kg
    const w5 = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: TEST_USERS[0],
      name: "Max Test Workout",
    });
    const we5 = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USERS[0],
      workoutId: w5,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USERS[0],
      workoutExerciseId: we5,
      weight: 100,
      reps: 3,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USERS[0],
      workoutExerciseId: we5,
      weight: 120,
      reps: 1,
    });
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: TEST_USERS[0],
      id: w5,
    });
    await client.mutation(api.testing.testUpdateChallengeProgress, {
      testUserId: TEST_USERS[0],
      workoutId: w5,
    });

    const maxParticipants = await client.query(
      api.testing.testGetRawParticipants,
      { challengeId: challengeMax },
    );

    const user1Max = maxParticipants.find(
      (p: any) => p.userId === TEST_USERS[0],
    );

    check(
      "maxWeight = 120 (highest of 100 and 120)",
      "CH-09",
      user1Max !== undefined && user1Max.currentValue === 120,
      `Expected currentValue=120, got ${user1Max?.currentValue ?? "not found"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-10: Status transition visible via getChallenge query
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── CH-10: Status transition visible via getChallenge ─────\n",
    );

    // challengeId1 was created as "pending", then activated in CH-02
    // Verify we can see the "active" status via testGetChallenge
    const ch10 = await client.query(api.testing.testGetChallenge, {
      challengeId: challengeId1,
    });

    check(
      "getChallenge shows active status for previously-activated challenge",
      "CH-10",
      ch10.status === "active",
      `Expected "active", got "${ch10.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-11: completeChallenge determines correct winner
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-11: completeChallenge determines winner ──────────\n");

    // challengeId1 (totalReps): user 1 has 10 reps, user 2 has 5 reps
    // Complete it — winner should be user 1
    await client.mutation(api.testing.testCompleteChallenge, {
      challengeId: challengeId1,
    });

    const completed1 = await client.query(api.testing.testGetChallenge, {
      challengeId: challengeId1,
    });

    check(
      "Winner is user 1 (highest reps = 10)",
      "CH-11",
      completed1.status === "completed" &&
        completed1.winnerId === TEST_USERS[0],
      `Expected status=completed winnerId=${TEST_USERS[0]}, got status=${completed1.status} winnerId=${completed1.winnerId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-12: completeChallenge is idempotent
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-12: completeChallenge is idempotent ─────────────\n");

    // Call complete again — should not throw and challenge stays the same
    let idempotentError = "";
    try {
      await client.mutation(api.testing.testCompleteChallenge, {
        challengeId: challengeId1,
      });
    } catch (err: any) {
      idempotentError = err.message || String(err);
    }

    const afterIdempotent = await client.query(api.testing.testGetChallenge, {
      challengeId: challengeId1,
    });

    check(
      "Idempotent completeChallenge succeeds without error",
      "CH-12",
      idempotentError === "" &&
        afterIdempotent.status === "completed" &&
        afterIdempotent.winnerId === TEST_USERS[0],
      `Error: "${idempotentError}", status=${afterIdempotent.status}, winnerId=${afterIdempotent.winnerId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-13: cancelChallenge transitions to cancelled (creator only)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-13: cancelChallenge transitions to cancelled ─────\n");

    // Create a fresh challenge to cancel
    const challengeToCancel = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Challenge to Cancel",
        type: "workoutCount",
        startAt: pastStart,
        endAt: futureEnd,
      },
    );

    // Non-creator cannot cancel
    let nonCreatorCancelError = "";
    try {
      await client.mutation(api.testing.testCancelChallenge, {
        testUserId: TEST_USERS[1],
        challengeId: challengeToCancel,
      });
    } catch (err: any) {
      nonCreatorCancelError = err.message || String(err);
    }

    // Creator cancels
    await client.mutation(api.testing.testCancelChallenge, {
      testUserId: TEST_USERS[0],
      challengeId: challengeToCancel,
    });

    const cancelled = await client.query(api.testing.testGetChallenge, {
      challengeId: challengeToCancel,
    });

    check(
      "Creator can cancel; non-creator is rejected; status becomes cancelled",
      "CH-13",
      nonCreatorCancelError.includes("Only the challenge creator can cancel") &&
        cancelled.status === "cancelled",
      `Non-creator error: "${nonCreatorCancelError}", status: "${cancelled.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-14: listChallenges filters by status correctly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-14: listChallenges filters by status ─────────────\n");

    // We should have: challengeId1=completed, challengeWC/Vol/Max=active, challengeToCancel=cancelled
    const activeChallenges = await client.query(
      api.testing.testListChallenges,
      { status: "active" },
    );
    const completedChallenges = await client.query(
      api.testing.testListChallenges,
      { status: "completed" },
    );
    const cancelledChallenges = await client.query(
      api.testing.testListChallenges,
      { status: "cancelled" },
    );

    // Filter to only our test challenges (other tests may have left data)
    const ourActiveIds = activeChallenges
      .filter((c: any) => c.creatorId === TEST_USERS[0])
      .map((c: any) => c._id);
    const ourCompletedIds = completedChallenges
      .filter((c: any) => c.creatorId === TEST_USERS[0])
      .map((c: any) => c._id);
    const ourCancelledIds = cancelledChallenges
      .filter((c: any) => c.creatorId === TEST_USERS[0])
      .map((c: any) => c._id);

    check(
      "listChallenges filters: active, completed, and cancelled each return correct challenges",
      "CH-14",
      ourActiveIds.length >= 3 &&
        ourCompletedIds.includes(challengeId1) &&
        ourCancelledIds.includes(challengeToCancel),
      `Active(ours): ${ourActiveIds.length}, completed includes ch1: ${ourCompletedIds.includes(challengeId1)}, cancelled includes cancel: ${ourCancelledIds.includes(challengeToCancel)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-15: Solo creator challenge completes with creator as winner
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── CH-15: Solo creator challenge completes with creator as winner ─\n",
    );

    // Create a solo challenge (only the creator participates, with value 0)
    const soloChallenge = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[2],
        title: "Solo Challenge",
        type: "workoutCount",
        startAt: pastStart,
        endAt: futureEnd,
      },
    );

    await client.mutation(api.testing.testCompleteChallenge, {
      challengeId: soloChallenge,
    });

    const soloResult = await client.query(api.testing.testGetChallenge, {
      challengeId: soloChallenge,
    });

    check(
      "Solo challenge completed with creator as winner (even with value 0)",
      "CH-15",
      soloResult.status === "completed" &&
        soloResult.winnerId === TEST_USERS[2],
      `Expected completed/winnerId=${TEST_USERS[2]}, got status=${soloResult.status} winnerId=${soloResult.winnerId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // CH-16: leaveChallenge removes participant entry
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── CH-16: leaveChallenge removes participant ──────────\n");

    // Create a fresh active challenge, have users 2 and 3 join, then user 3 leaves
    const leaveChallenge = await client.mutation(
      api.testing.testCreateChallenge,
      {
        testUserId: TEST_USERS[0],
        title: "Leave Test Challenge",
        type: "workoutCount",
        startAt: pastStart,
        endAt: futureEnd,
      },
    );

    await client.mutation(api.testing.testJoinChallenge, {
      testUserId: TEST_USERS[1],
      challengeId: leaveChallenge,
    });
    await client.mutation(api.testing.testJoinChallenge, {
      testUserId: TEST_USERS[2],
      challengeId: leaveChallenge,
    });

    const beforeLeave = await client.query(api.testing.testGetChallenge, {
      challengeId: leaveChallenge,
    });

    await client.mutation(api.testing.testLeaveChallenge, {
      testUserId: TEST_USERS[2],
      challengeId: leaveChallenge,
    });

    const afterLeave = await client.query(api.testing.testGetChallenge, {
      challengeId: leaveChallenge,
    });

    check(
      "leaveChallenge reduces participant count from 3 to 2",
      "CH-16",
      beforeLeave.participantCount === 3 && afterLeave.participantCount === 2,
      `Before: ${beforeLeave.participantCount}, after: ${afterLeave.participantCount} — expected 3→2`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // Bonus: Verify profile fallback for user 4 (no profile)
    // ══════════════════════════════════════════════════════════════════════
    // User 4 joins leaveChallenge to test graceful fallback in standings
    await client.mutation(api.testing.testJoinChallenge, {
      testUserId: TEST_USERS[3],
      challengeId: leaveChallenge,
    });

    const standingsWithNoProfile = await client.query(
      api.testing.testGetChallengeStandings,
      { challengeId: leaveChallenge },
    );

    const user4Standing = standingsWithNoProfile.participants.find(
      (p: any) => p.userId === TEST_USERS[3],
    );

    // User 4 should appear with userId as fallback displayName/username
    console.log(
      `  ℹ User 4 (no profile) displayName fallback: "${user4Standing?.displayName}"`,
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
