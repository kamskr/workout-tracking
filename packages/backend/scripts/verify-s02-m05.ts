#!/usr/bin/env npx tsx
/**
 * S02-M05 End-to-End Verification Script — Shared Timer, Session Lifecycle & Combined Summary
 *
 * Exercises the S02 backend functions to verify:
 *   SS-13: startSharedTimer sets sharedTimerEndAt in future
 *   SS-14: pauseSharedTimer clears sharedTimerEndAt
 *   SS-15: skipSharedTimer clears sharedTimerEndAt
 *   SS-16: Non-host can start timer (D140 last-write-wins)
 *   SS-17: endSession by host completes session
 *   SS-18: endSession by non-host rejected
 *   SS-19: endSession idempotent on already-completed session
 *   SS-20: getSessionSummary returns per-participant stats
 *   SS-21: checkSessionTimeouts auto-completes stale session
 *   SS-22: checkSessionTimeouts skips session with recent heartbeat
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s02-m05.ts
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

const TEST_HOST = "test-host-s02";
const TEST_JOINER = "test-joiner-s02";

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
    // ══════════════════════════════════════════════════════════════════════
    // Setup: Create session, join, add exercises, log sets
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Setup: Create session + exercises + sets ─────────────\n");

    const { sessionId, inviteCode } = await client.mutation(
      api.testing.testCreateSession,
      { testUserId: TEST_HOST },
    );
    console.log(`  ✓ Session created: ${sessionId} (invite: ${inviteCode})`);

    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode,
    });
    console.log(`  ✓ Joiner joined session`);

    // Get participants to access workoutIds
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

    // Get an exercise from the library
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error(
        `Need at least 1 exercise in library, got ${allExercises.length}`,
      );
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})`);

    // Add exercise and log sets for host
    const hostWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_HOST,
      workoutId: hostParticipant.workoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_HOST,
      workoutExerciseId: hostWE,
      weight: 100,
      reps: 8,
    });
    console.log(`  ✓ Host: 1 exercise, 1 set (100kg × 8)`);

    // Add exercise and log sets for joiner
    const joinerWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_JOINER,
      workoutId: joinerParticipant.workoutId,
      exerciseId: exercise._id,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_JOINER,
      workoutExerciseId: joinerWE,
      weight: 80,
      reps: 10,
    });
    console.log(`  ✓ Joiner: 1 exercise, 1 set (80kg × 10)\n`);

    // ══════════════════════════════════════════════════════════════════════
    // SS-13: startSharedTimer sets sharedTimerEndAt in future
    // ══════════════════════════════════════════════════════════════════════
    console.log("── SS-13: startSharedTimer sets timer in future ────────\n");

    const beforeTimer = Date.now();
    await client.mutation(api.testing.testStartSharedTimer, {
      testUserId: TEST_HOST,
      sessionId,
      durationSeconds: 90,
    });

    const sessionAfterStart = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "startSharedTimer sets sharedTimerEndAt in future",
      "SS-13",
      sessionAfterStart.sharedTimerEndAt !== undefined &&
        sessionAfterStart.sharedTimerEndAt !== null &&
        typeof sessionAfterStart.sharedTimerEndAt === "number" &&
        sessionAfterStart.sharedTimerEndAt > beforeTimer &&
        sessionAfterStart.sharedTimerDurationSeconds === 90,
      `sharedTimerEndAt=${sessionAfterStart.sharedTimerEndAt}, beforeTimer=${beforeTimer}, durationSeconds=${sessionAfterStart.sharedTimerDurationSeconds}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-14: pauseSharedTimer clears sharedTimerEndAt
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-14: pauseSharedTimer clears timer ─────────────────\n");

    await client.mutation(api.testing.testPauseSharedTimer, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const sessionAfterPause = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "pauseSharedTimer clears sharedTimerEndAt",
      "SS-14",
      sessionAfterPause.sharedTimerEndAt === undefined ||
        sessionAfterPause.sharedTimerEndAt === null,
      `sharedTimerEndAt=${sessionAfterPause.sharedTimerEndAt} (expected undefined/null)`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-15: skipSharedTimer clears sharedTimerEndAt
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-15: skipSharedTimer clears timer ──────────────────\n");

    // Start timer again first
    await client.mutation(api.testing.testStartSharedTimer, {
      testUserId: TEST_HOST,
      sessionId,
      durationSeconds: 60,
    });

    // Verify it was set
    const sessionBeforeSkip = await client.query(api.testing.testGetSession, {
      sessionId,
    });
    if (!sessionBeforeSkip.sharedTimerEndAt) {
      console.log("  ⚠ Timer was not set before skip test");
    }

    // Skip it
    await client.mutation(api.testing.testSkipSharedTimer, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const sessionAfterSkip = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "skipSharedTimer clears sharedTimerEndAt",
      "SS-15",
      sessionAfterSkip.sharedTimerEndAt === undefined ||
        sessionAfterSkip.sharedTimerEndAt === null,
      `sharedTimerEndAt=${sessionAfterSkip.sharedTimerEndAt} (expected undefined/null)`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-16: Non-host can start timer (D140)
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-16: Non-host can start timer (D140) ──────────────\n");

    await client.mutation(api.testing.testStartSharedTimer, {
      testUserId: TEST_JOINER,
      sessionId,
      durationSeconds: 60,
    });

    const sessionAfterJoinerTimer = await client.query(
      api.testing.testGetSession,
      { sessionId },
    );

    check(
      "Non-host can start timer — sharedTimerEndAt exists and duration is 60",
      "SS-16",
      sessionAfterJoinerTimer.sharedTimerEndAt !== undefined &&
        sessionAfterJoinerTimer.sharedTimerEndAt !== null &&
        typeof sessionAfterJoinerTimer.sharedTimerEndAt === "number" &&
        sessionAfterJoinerTimer.sharedTimerDurationSeconds === 60,
      `sharedTimerEndAt=${sessionAfterJoinerTimer.sharedTimerEndAt}, durationSeconds=${sessionAfterJoinerTimer.sharedTimerDurationSeconds}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-17: endSession by host completes session
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-17: endSession by host completes session ─────────\n");

    await client.mutation(api.testing.testEndSession, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const sessionAfterEnd = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "endSession by host sets status to 'completed' and completedAt is a number",
      "SS-17",
      sessionAfterEnd.status === "completed" &&
        typeof sessionAfterEnd.completedAt === "number",
      `status="${sessionAfterEnd.status}", completedAt=${sessionAfterEnd.completedAt}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-18: endSession by non-host rejected
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-18: endSession by non-host rejected ──────────────\n");

    // Create a fresh session for this test
    const session18 = await client.mutation(api.testing.testCreateSession, {
      testUserId: TEST_HOST,
    });
    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: session18.inviteCode,
    });

    let endSessionError = "";
    try {
      await client.mutation(api.testing.testEndSession, {
        testUserId: TEST_JOINER,
        sessionId: session18.sessionId,
      });
    } catch (err: any) {
      endSessionError = err.message || String(err);
    }

    check(
      "endSession by non-host throws error containing 'host'",
      "SS-18",
      endSessionError.toLowerCase().includes("host"),
      `Expected error containing "host", got: "${endSessionError}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-19: endSession idempotent on already-completed session
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-19: endSession idempotent ────────────────────────\n");

    let idempotentError = "";
    try {
      // Call endSession again on the already-completed first session
      await client.mutation(api.testing.testEndSession, {
        testUserId: TEST_HOST,
        sessionId,
      });
    } catch (err: any) {
      idempotentError = err.message || String(err);
    }

    check(
      "endSession on already-completed session does NOT throw",
      "SS-19",
      idempotentError === "",
      `Expected no error, got: "${idempotentError}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-20: getSessionSummary returns per-participant stats
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-20: getSessionSummary returns per-participant stats ─\n",
    );

    const summary = await client.query(api.testing.testGetSessionSummary, {
      sessionId,
    });

    const hasTwoParticipants =
      summary.participantSummaries &&
      summary.participantSummaries.length === 2;

    let allParticipantsValid = false;
    if (hasTwoParticipants) {
      allParticipantsValid = summary.participantSummaries.every(
        (ps: any) =>
          ps.exerciseCount >= 1 &&
          ps.setCount >= 1 &&
          ps.totalVolume >= 0 &&
          typeof ps.displayName === "string",
      );
    }

    check(
      "getSessionSummary returns 2 participants with valid stats",
      "SS-20",
      hasTwoParticipants && allParticipantsValid,
      `participantCount=${summary.participantSummaries?.length}, valid=${allParticipantsValid}, summaries=${JSON.stringify(summary.participantSummaries?.map((ps: any) => ({ displayName: ps.displayName, exerciseCount: ps.exerciseCount, setCount: ps.setCount, totalVolume: ps.totalVolume })))}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-21: checkSessionTimeouts auto-completes stale session
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-21: checkSessionTimeouts auto-completes stale ──────\n",
    );

    // Create a fresh session
    const session21 = await client.mutation(api.testing.testCreateSession, {
      testUserId: TEST_HOST,
    });
    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: session21.inviteCode,
    });

    const twentyMinAgo = Date.now() - 20 * 60 * 1000;

    // Set session createdAt to 20 minutes ago
    await client.mutation(api.testing.testPatchSessionCreatedAt, {
      sessionId: session21.sessionId,
      createdAt: twentyMinAgo,
    });

    // Set all participants' heartbeats to 20 minutes ago
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_HOST,
      sessionId: session21.sessionId,
      lastHeartbeatAt: twentyMinAgo,
    });
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_JOINER,
      sessionId: session21.sessionId,
      lastHeartbeatAt: twentyMinAgo,
    });

    // Run timeout check
    await client.mutation(api.testing.testCheckSessionTimeouts, {});

    const session21After = await client.query(api.testing.testGetSession, {
      sessionId: session21.sessionId,
    });

    check(
      "checkSessionTimeouts auto-completes session with all-stale heartbeats",
      "SS-21",
      session21After.status === "completed",
      `Expected status="completed", got "${session21After.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-22: checkSessionTimeouts skips session with recent heartbeat
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-22: checkSessionTimeouts skips recent heartbeat ────\n",
    );

    // Create another fresh session
    const session22 = await client.mutation(api.testing.testCreateSession, {
      testUserId: TEST_HOST,
    });
    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_JOINER,
      inviteCode: session22.inviteCode,
    });

    // Set session createdAt to 20 min ago (old enough to be eligible)
    await client.mutation(api.testing.testPatchSessionCreatedAt, {
      sessionId: session22.sessionId,
      createdAt: twentyMinAgo,
    });

    // Set host heartbeat stale, but leave joiner with fresh heartbeat
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_HOST,
      sessionId: session22.sessionId,
      lastHeartbeatAt: twentyMinAgo,
    });
    // Joiner keeps fresh heartbeat (set at join time, which is recent)

    // Run timeout check
    await client.mutation(api.testing.testCheckSessionTimeouts, {});

    const session22After = await client.query(api.testing.testGetSession, {
      sessionId: session22.sessionId,
    });

    check(
      "checkSessionTimeouts skips session with at least one recent heartbeat",
      "SS-22",
      session22After.status === "active",
      `Expected status="active", got "${session22After.status}"`,
    );
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    console.log(
      "\n── Cleanup ──────────────────────────────────────────────\n",
    );
    for (const userId of ALL_TEST_USERS) {
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
