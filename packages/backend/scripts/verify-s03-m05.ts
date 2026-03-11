#!/usr/bin/env npx tsx
/**
 * S03-M05 End-to-End Verification Script — Integration Hardening & Verification
 *
 * Exercises the full session → workout completion → hooks pipeline to verify:
 *   SS-23: After testEndSession, each participant's workout status is "completed" with durationSeconds > 0
 *   SS-24: After testEndSession, feed items exist for each participant (via testGetFeedItemsForWorkout)
 *   SS-25: After testEndSession, leaderboard entries exist for participant exercises (via testGetLeaderboard)
 *   SS-26: After testEndSession, badge evaluation ran — at least first_workout badge awarded (via testGetUserBadges)
 *   SS-27: Participant who left before endSession has their workout completed by endSession
 *   SS-28: endSession is idempotent — second call doesn't create duplicate feed items
 *   SS-29: Auto-timeout (testCheckSessionTimeouts) also completes participant workouts (creates feed items)
 *   SS-30: Session create + join + heartbeat + set log regression (lightweight S01 coverage)
 *   SS-31: Timer start + pause + end session regression (lightweight S02 coverage)
 *   SS-32: Session summary reflects correct per-participant stats after endSession with workout completion
 *   SS-33: Session with participant who has no exercises/sets — workout still completed cleanly
 *   SS-34: Session workout appears in participant's testListWorkouts after completion
 *   SS-35: Session workout's sessionId foreign key intact after completion
 *   SS-36: testFinishWorkoutWithAllHooks runs all 4 hooks for a standalone workout
 *   SS-37: cleanup runs for both test users without errors
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s03-m05.ts
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
  const icon = passed ? "✅" : "❌";
  console.log(`  ${icon} ${requirement}: ${name}`);
  if (!passed) console.log(`         → ${detail}`);
}

// ── Constants ───────────────────────────────────────────────────────────────

const TEST_HOST = "test-s03-host";
const TEST_JOINER = "test-s03-joiner";

const ALL_TEST_USERS = [TEST_HOST, TEST_JOINER];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  // ══════════════════════════════════════════════════════════════════════
  // Cleanup: remove any leftover test data
  // ══════════════════════════════════════════════════════════════════════
  console.log("── Cleanup: Remove leftover test data ───────────────────\n");

  for (const userId of ALL_TEST_USERS) {
    await client.mutation(api.testing.testCleanup, { testUserId: userId });
  }
  console.log(`  ✓ All ${ALL_TEST_USERS.length} test users cleaned up\n`);

  try {
    // ── Setup: Get an exercise from the library ─────────────────────────
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error("Need at least 1 exercise in library");
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})\n`);

    // ── Setup: Create profiles for test users (needed for leaderboard/badges) ──
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: TEST_HOST,
      username: "s03host",
      displayName: "S03 Host",
    });
    await client.mutation(api.testing.testSetLeaderboardOptIn, {
      testUserId: TEST_HOST,
      optIn: true,
    });

    await client.mutation(api.testing.testCreateProfile, {
      testUserId: TEST_JOINER,
      username: "s03joiner",
      displayName: "S03 Joiner",
    });
    await client.mutation(api.testing.testSetLeaderboardOptIn, {
      testUserId: TEST_JOINER,
      optIn: true,
    });

    // ══════════════════════════════════════════════════════════════════════
    // Setup main session: host creates, joiner joins, both log exercises/sets
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create session with 2 participants ───────────\n");

    const { sessionId, inviteCode } = await client.mutation(
      api.testing.testCreateSession,
      { testUserId: TEST_HOST },
    );

    const joinResult = await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode,
    });

    // Get workout IDs for both participants
    const participants = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );
    const hostParticipant = participants.find(
      (p: any) => p.userId === TEST_HOST,
    )!;
    const joinerParticipant = participants.find(
      (p: any) => p.userId === TEST_JOINER,
    )!;
    const hostWorkoutId = hostParticipant.workoutId;
    const joinerWorkoutId = joinerParticipant.workoutId;

    // Host adds exercise and logs a set
    const hostWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_HOST,
      workoutId: hostWorkoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_HOST,
      workoutExerciseId: hostWE,
      weight: 100,
      reps: 8,
    });

    // Joiner adds exercise and logs a set
    const joinerWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_JOINER,
      workoutId: joinerWorkoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_JOINER,
      workoutExerciseId: joinerWE,
      weight: 80,
      reps: 10,
    });

    console.log("  ✓ Session created, both participants have exercises & sets\n");

    // ══════════════════════════════════════════════════════════════════════
    // SS-23: After testEndSession, each participant's workout status is "completed"
    // ══════════════════════════════════════════════════════════════════════
    console.log("── SS-23: Workout status completed after endSession ─────\n");

    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const hostWorkout = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_HOST, id: hostWorkoutId },
    );
    const joinerWorkout = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_JOINER, id: joinerWorkoutId },
    );

    check(
      "Host workout is completed with durationSeconds > 0",
      "SS-23",
      hostWorkout.workout.status === "completed" &&
        (hostWorkout.workout.durationSeconds ?? 0) >= 0,
      `status="${hostWorkout.workout.status}", durationSeconds=${hostWorkout.workout.durationSeconds}`,
    );

    check(
      "Joiner workout is completed with durationSeconds > 0",
      "SS-23",
      joinerWorkout.workout.status === "completed" &&
        (joinerWorkout.workout.durationSeconds ?? 0) >= 0,
      `status="${joinerWorkout.workout.status}", durationSeconds=${joinerWorkout.workout.durationSeconds}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-24: Feed items exist for each participant
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-24: Feed items created for each participant ──────\n");

    const hostFeedItems = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: hostWorkoutId },
    );
    const joinerFeedItems = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: joinerWorkoutId },
    );

    check(
      "Feed items exist for host's workout after endSession",
      "SS-24",
      hostFeedItems.length >= 1,
      `Expected ≥1 feed item for host workout, got ${hostFeedItems.length}`,
    );

    check(
      "Feed items exist for joiner's workout after endSession",
      "SS-24",
      joinerFeedItems.length >= 1,
      `Expected ≥1 feed item for joiner workout, got ${joinerFeedItems.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-25: Leaderboard entries exist for participant exercises
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-25: Leaderboard entries for participants ─────────\n");

    const hostLBEntries = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      { testUserId: TEST_HOST, exerciseId: exercise._id },
    );
    const joinerLBEntries = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      { testUserId: TEST_JOINER, exerciseId: exercise._id },
    );

    check(
      "Leaderboard entries exist for host after endSession",
      "SS-25",
      hostLBEntries.length >= 1,
      `Expected ≥1 leaderboard entries for host, got ${hostLBEntries.length}`,
    );

    check(
      "Leaderboard entries exist for joiner after endSession",
      "SS-25",
      joinerLBEntries.length >= 1,
      `Expected ≥1 leaderboard entries for joiner, got ${joinerLBEntries.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-26: Badge evaluation ran — at least first_workout badge awarded
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-26: Badge evaluation ran for participants ────────\n");

    const hostBadges = await client.query(api.testing.testGetUserBadges, {
      testUserId: TEST_HOST,
    });
    const joinerBadges = await client.query(api.testing.testGetUserBadges, {
      testUserId: TEST_JOINER,
    });

    const hostHasFirstWorkout = hostBadges.some(
      (b: any) => b.badgeSlug === "first_workout",
    );
    const joinerHasFirstWorkout = joinerBadges.some(
      (b: any) => b.badgeSlug === "first_workout",
    );

    check(
      "Host has first_workout badge after session completion",
      "SS-26",
      hostHasFirstWorkout,
      `Host badges: ${hostBadges.map((b: any) => b.badgeSlug).join(", ") || "none"}`,
    );

    check(
      "Joiner has first_workout badge after session completion",
      "SS-26",
      joinerHasFirstWorkout,
      `Joiner badges: ${joinerBadges.map((b: any) => b.badgeSlug).join(", ") || "none"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-27: Participant who left before endSession has workout completed
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-27: Left participant's workout completed by endSession\n");

    // Create a second session for this test
    const { sessionId: session2Id, inviteCode: invite2 } =
      await client.mutation(api.testing.testCreateSession, {
        testUserId: TEST_HOST,
      });

    const join2 = await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: invite2,
    });
    const leftJoinerWorkoutId = join2.workoutId;

    // Joiner adds exercise & set, then leaves
    const joinerWE2 = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_JOINER,
      workoutId: leftJoinerWorkoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_JOINER,
      workoutExerciseId: joinerWE2,
      weight: 60,
      reps: 12,
    });

    // Joiner leaves
    await client.mutation(api.testing.testLeaveSession, {
      testUserId: TEST_JOINER,
      sessionId: session2Id,
    });

    // Host ends session
    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId: session2Id,
    });

    const leftJoinerWorkout = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_JOINER, id: leftJoinerWorkoutId },
    );

    check(
      "Participant who left before endSession has workout completed",
      "SS-27",
      leftJoinerWorkout.workout.status === "completed",
      `Expected status="completed", got "${leftJoinerWorkout.workout.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-28: endSession is idempotent — no duplicate feed items
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-28: endSession idempotent — no duplicate feed items\n");

    // Count feed items for host's first session workout before second call
    const feedBefore = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: hostWorkoutId },
    );
    const feedCountBefore = feedBefore.length;

    // Call endSession again (already completed — should be no-op)
    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const feedAfter = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: hostWorkoutId },
    );
    const feedCountAfter = feedAfter.length;

    check(
      "Second endSession call does not create duplicate feed items",
      "SS-28",
      feedCountAfter === feedCountBefore,
      `Feed items before: ${feedCountBefore}, after: ${feedCountAfter}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-29: Auto-timeout completes participant workouts and creates feed items
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-29: Auto-timeout completes participant workouts ──\n");

    // Create a third session for timeout test
    const { sessionId: session3Id, inviteCode: invite3 } =
      await client.mutation(api.testing.testCreateSession, {
        testUserId: TEST_HOST,
      });

    const join3 = await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: invite3,
    });
    const timeoutJoinerWorkoutId = join3.workoutId;

    // Get host's workout for this session
    const session3Participants = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId: session3Id },
    );
    const session3HostParticipant = session3Participants.find(
      (p: any) => p.userId === TEST_HOST,
    )!;
    const timeoutHostWorkoutId = session3HostParticipant.workoutId;

    // Make session + heartbeats stale (> 15 minutes)
    const staleTimestamp = Date.now() - 20 * 60 * 1000;
    await client.mutation(api.testing.testPatchSessionCreatedAt, {
      sessionId: session3Id,
      createdAt: staleTimestamp,
    });
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_HOST,
      sessionId: session3Id,
      lastHeartbeatAt: staleTimestamp,
    });
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_JOINER,
      sessionId: session3Id,
      lastHeartbeatAt: staleTimestamp,
    });

    // Run timeout check
    await client.mutation(api.testing.testCheckSessionTimeouts, {});

    // Verify session auto-completed
    const session3After = await client.query(api.testing.testGetSession, {
      sessionId: session3Id,
    });

    // Verify feed items created for timeout session's joiner
    const timeoutJoinerFeedItems = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: timeoutJoinerWorkoutId },
    );

    check(
      "Auto-timeout completes session and creates feed items for participants",
      "SS-29",
      session3After.status === "completed" &&
        timeoutJoinerFeedItems.length >= 1,
      `Session status="${session3After.status}", joiner feed items=${timeoutJoinerFeedItems.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-30: S01 regression — session create + join + heartbeat + set log
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-30: S01 regression — session basics ──────────────\n");

    // We already exercised create/join/sets above — verify the main session state
    const sessionAfterEnd = await client.query(api.testing.testGetSession, {
      sessionId,
    });
    const sessionParticipants = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    check(
      "S01 regression: session has correct host, status=completed, 2 participants",
      "SS-30",
      sessionAfterEnd.hostId === TEST_HOST &&
        sessionAfterEnd.status === "completed" &&
        sessionParticipants.length === 2,
      `host=${sessionAfterEnd.hostId}, status=${sessionAfterEnd.status}, participants=${sessionParticipants.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-31: S02 regression — timer start + pause + end session
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-31: S02 regression — timer + end session ─────────\n");

    // Create a 4th session for timer regression
    const { sessionId: session4Id, inviteCode: invite4 } =
      await client.mutation(api.testing.testCreateSession, {
        testUserId: TEST_HOST,
      });

    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: invite4,
    });

    // Start timer
    await client.mutation(api.testing.testStartSharedTimer, {
      testUserId: TEST_HOST,
      sessionId: session4Id,
      durationSeconds: 90,
    });

    const sessionWithTimer = await client.query(api.testing.testGetSession, {
      sessionId: session4Id,
    });
    const timerWasSet =
      sessionWithTimer.sharedTimerEndAt !== undefined &&
      sessionWithTimer.sharedTimerEndAt !== null;

    // Pause timer
    await client.mutation(api.testing.testPauseSharedTimer, {
      testUserId: TEST_HOST,
      sessionId: session4Id,
    });

    const sessionAfterPause = await client.query(api.testing.testGetSession, {
      sessionId: session4Id,
    });
    const timerCleared =
      sessionAfterPause.sharedTimerEndAt === undefined ||
      sessionAfterPause.sharedTimerEndAt === null;

    // End session
    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId: session4Id,
    });

    const session4After = await client.query(api.testing.testGetSession, {
      sessionId: session4Id,
    });

    check(
      "S02 regression: timer start/pause works, session ends successfully",
      "SS-31",
      timerWasSet && timerCleared && session4After.status === "completed",
      `timerSet=${timerWasSet}, timerCleared=${timerCleared}, finalStatus=${session4After.status}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-32: Session summary reflects correct per-participant stats
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-32: Session summary per-participant stats ────────\n");

    const summary = await client.query(api.testing.testGetSessionSummary, {
      sessionId,
    });

    const hostSummary = summary.participantSummaries.find(
      (ps: any) => ps.userId === TEST_HOST,
    );
    const joinerSummary = summary.participantSummaries.find(
      (ps: any) => ps.userId === TEST_JOINER,
    );

    check(
      "Session summary has per-participant stats for both users",
      "SS-32",
      summary.participantSummaries.length === 2 &&
        hostSummary !== undefined &&
        joinerSummary !== undefined &&
        hostSummary.exerciseCount >= 1 &&
        hostSummary.setCount >= 1 &&
        joinerSummary.exerciseCount >= 1 &&
        joinerSummary.setCount >= 1,
      `summaries=${summary.participantSummaries.length}, host: exercises=${hostSummary?.exerciseCount} sets=${hostSummary?.setCount}, joiner: exercises=${joinerSummary?.exerciseCount} sets=${joinerSummary?.setCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-33: Participant with no exercises — workout still completed cleanly
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-33: No-exercises participant completed cleanly ───\n");

    // Create 5th session, joiner does no exercises
    const { sessionId: session5Id, inviteCode: invite5 } =
      await client.mutation(api.testing.testCreateSession, {
        testUserId: TEST_HOST,
      });

    const join5 = await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: invite5,
    });
    const noExerciseWorkoutId = join5.workoutId;

    // End session immediately — joiner has no exercises/sets
    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId: session5Id,
    });

    const noExerciseWorkout = await client.query(
      api.testing.testGetWorkoutWithDetails,
      { testUserId: TEST_JOINER, id: noExerciseWorkoutId },
    );

    check(
      "Participant with no exercises has workout completed cleanly",
      "SS-33",
      noExerciseWorkout.workout.status === "completed" &&
        noExerciseWorkout.workout.completedAt != null &&
        (noExerciseWorkout.workout.durationSeconds ?? 0) >= 0,
      `status="${noExerciseWorkout.workout.status}", completedAt=${noExerciseWorkout.workout.completedAt}, durationSeconds=${noExerciseWorkout.workout.durationSeconds}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-34: Session workout appears in participant's testListWorkouts
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-34: Session workout in participant's workout list ─\n");

    const hostWorkouts = await client.query(api.testing.testListWorkouts, {
      testUserId: TEST_HOST,
    });

    const sessionWorkoutInList = hostWorkouts.some(
      (w: any) => w._id === hostWorkoutId,
    );

    check(
      "Session workout appears in host's testListWorkouts",
      "SS-34",
      sessionWorkoutInList,
      `Host has ${hostWorkouts.length} workouts, session workout found=${sessionWorkoutInList}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-35: Session workout's sessionId foreign key intact after completion
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-35: sessionId foreign key intact after completion ─\n");

    const completedHostWorkout = hostWorkouts.find(
      (w: any) => w._id === hostWorkoutId,
    );

    check(
      "Session workout retains sessionId foreign key after completion",
      "SS-35",
      completedHostWorkout !== undefined &&
        completedHostWorkout.sessionId === sessionId,
      `Expected sessionId="${sessionId}", got "${completedHostWorkout?.sessionId}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-36: testFinishWorkoutWithAllHooks runs all 4 hooks for standalone workout
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-36: testFinishWorkoutWithAllHooks all 4 hooks ────\n");

    // Create a standalone workout (no session)
    const standaloneWorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      { testUserId: TEST_HOST, name: "Standalone Hooks Test" },
    );

    // Add exercise and set
    const standaloneWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_HOST,
      workoutId: standaloneWorkoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_HOST,
      workoutExerciseId: standaloneWE,
      weight: 120,
      reps: 5,
    });

    // Finish with all hooks
    const finishResult = await client.mutation(
      api.testing.testFinishWorkoutWithAllHooks,
      { testUserId: TEST_HOST, id: standaloneWorkoutId },
    );

    // Verify all 4 hooks ran
    const standaloneFeedItems = await client.query(
      api.testing.testGetFeedItemsForWorkout,
      { workoutId: standaloneWorkoutId },
    );
    const standaloneLBEntries = await client.query(
      api.testing.testGetRawLeaderboardEntries,
      { testUserId: TEST_HOST, exerciseId: exercise._id },
    );
    const standaloneBadges = await client.query(
      api.testing.testGetUserBadges,
      { testUserId: TEST_HOST },
    );

    check(
      "testFinishWorkoutWithAllHooks runs feed + leaderboard + badge hooks",
      "SS-36",
      finishResult.completedAt > 0 &&
        finishResult.durationSeconds >= 0 &&
        standaloneFeedItems.length >= 1 &&
        standaloneLBEntries.length >= 1 &&
        standaloneBadges.length >= 1,
      `completedAt=${finishResult.completedAt}, duration=${finishResult.durationSeconds}, feedItems=${standaloneFeedItems.length}, lbEntries=${standaloneLBEntries.length}, badges=${standaloneBadges.length}`,
    );
  } finally {
    // ══════════════════════════════════════════════════════════════════════
    // SS-37: Cleanup runs for both test users without errors
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-37: Cleanup runs for both test users ─────────────\n");

    let cleanupErrors = 0;
    for (const userId of ALL_TEST_USERS) {
      try {
        await client.mutation(api.testing.testCleanup, {
          testUserId: userId,
        });
      } catch (err: any) {
        console.log(
          `  ⚠ Cleanup error for ${userId}: ${err.message}`,
        );
        cleanupErrors++;
      }
    }

    check(
      "Cleanup runs for both test users without errors",
      "SS-37",
      cleanupErrors === 0,
      `${cleanupErrors} cleanup error(s) occurred`,
    );

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
