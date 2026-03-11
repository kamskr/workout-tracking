#!/usr/bin/env npx tsx
/**
 * S01-M05 End-to-End Verification Script — Group Sessions
 *
 * Exercises the session backend to verify:
 *   SS-01: Session created with valid 6-char invite code
 *   SS-02: Session status is "waiting" with correct hostId
 *   SS-03: New session has exactly 1 participant (host) with status "active"
 *   SS-04: User B joins via invite code, participant count increases to 2
 *   SS-05: Session status transitions from "waiting" to "active" after first non-host join
 *   SS-06: Duplicate join is idempotent — count stays 2
 *   SS-07: sendHeartbeat updates lastHeartbeatAt
 *   SS-08: Set logged for user A appears in session set feed
 *   SS-09: Sets from both participants appear in session set feed
 *   SS-10: leaveSession marks participant status as "left"
 *   SS-11: cleanupPresence marks stale participants as "idle"
 *   SS-12: Session full (max 10) — 11th join rejected
 *
 * Uses `testing.*` functions that bypass Clerk auth by accepting `testUserId` directly.
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s01-m05.ts
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

const TEST_HOST = "test-session-host";
const TEST_USER_B = "test-session-user-b";
const TEST_USER_C = "test-session-user-c";

const ALL_TEST_USERS = [TEST_HOST, TEST_USER_B, TEST_USER_C];

// Cap test users: test-session-cap-1 through test-session-cap-10
const CAP_TEST_USERS = Array.from(
  { length: 10 },
  (_, i) => `test-session-cap-${i + 1}`,
);

const ALL_CLEANUP_USERS = [...ALL_TEST_USERS, ...CAP_TEST_USERS];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  // ══════════════════════════════════════════════════════════════════════
  // Cleanup: remove any leftover test data
  // ══════════════════════════════════════════════════════════════════════
  console.log("── Cleanup: Remove leftover test data ───────────────────\n");

  for (const userId of ALL_CLEANUP_USERS) {
    await client.mutation(api.testing.testCleanup, { testUserId: userId });
  }
  console.log(`  ✓ All ${ALL_CLEANUP_USERS.length} test users cleaned up\n`);

  try {
    // ══════════════════════════════════════════════════════════════════════
    // SS-01: Session created with valid 6-char invite code
    // ══════════════════════════════════════════════════════════════════════
    console.log("── SS-01: Session created with valid invite code ───────\n");

    const { sessionId, inviteCode } = await client.mutation(
      api.testing.testCreateSession,
      { testUserId: TEST_HOST },
    );

    const validInviteCodeChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

    check(
      "testCreateSession returns sessionId and valid 6-char invite code",
      "SS-01",
      typeof sessionId === "string" &&
        sessionId.length > 0 &&
        typeof inviteCode === "string" &&
        validInviteCodeChars.test(inviteCode),
      `sessionId="${sessionId}", inviteCode="${inviteCode}", valid=${validInviteCodeChars.test(inviteCode)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-02: Session status is "waiting" with correct hostId
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-02: Session status 'waiting' with correct host ──\n");

    const session = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "Session status is 'waiting' and hostId matches test host",
      "SS-02",
      session.status === "waiting" && session.hostId === TEST_HOST,
      `Expected status="waiting" hostId="${TEST_HOST}", got status="${session.status}" hostId="${session.hostId}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-03: New session has exactly 1 participant (host) with status "active"
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-03: New session has 1 participant (host, active) ──\n",
    );

    const participants1 = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    const hostParticipant = participants1.find(
      (p: any) => p.userId === TEST_HOST,
    );

    check(
      "New session has exactly 1 participant (host) with active status",
      "SS-03",
      participants1.length === 1 &&
        hostParticipant !== undefined &&
        hostParticipant.derivedStatus === "active",
      `Expected 1 participant (host, active), got ${participants1.length} participants, host derivedStatus="${hostParticipant?.derivedStatus}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-04: User B joins via invite code, participant count increases to 2
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-04: User B joins via invite code ─────────────────\n");

    await client.mutation(api.testing.testJoinSession, {
      testUserId: TEST_USER_B,
      inviteCode,
    });

    const participants2 = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    check(
      "After user B joins, participant count is 2",
      "SS-04",
      participants2.length === 2,
      `Expected 2 participants, got ${participants2.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-05: Session status transitions "waiting" → "active" after non-host join
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-05: Status transitions waiting → active ──────────\n",
    );

    const sessionAfterJoin = await client.query(api.testing.testGetSession, {
      sessionId,
    });

    check(
      "Session status is 'active' after first non-host join",
      "SS-05",
      sessionAfterJoin.status === "active",
      `Expected status="active", got "${sessionAfterJoin.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-06: Duplicate join is idempotent — count stays 2
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-06: Duplicate join is idempotent ─────────────────\n");

    let duplicateError = "";
    try {
      await client.mutation(api.testing.testJoinSession, {
        testUserId: TEST_USER_B,
        inviteCode,
      });
    } catch (err: any) {
      duplicateError = err.message || String(err);
    }

    const participants3 = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    check(
      "Duplicate join does not throw and participant count remains 2",
      "SS-06",
      duplicateError === "" && participants3.length === 2,
      `Error: "${duplicateError}", participant count: ${participants3.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-07: sendHeartbeat updates lastHeartbeatAt
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── SS-07: sendHeartbeat updates lastHeartbeatAt ───────\n");

    // Capture host's lastHeartbeatAt before
    const participantsBefore = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );
    const hostBefore = participantsBefore.find(
      (p: any) => p.userId === TEST_HOST,
    );
    const heartbeatBefore = hostBefore?.lastHeartbeatAt ?? 0;

    // Small delay to ensure timestamp differs
    await new Promise((resolve) => setTimeout(resolve, 50));

    await client.mutation(api.testing.testSendHeartbeat, {
      testUserId: TEST_HOST,
      sessionId,
    });

    const participantsAfter = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );
    const hostAfter = participantsAfter.find(
      (p: any) => p.userId === TEST_HOST,
    );
    const heartbeatAfter = hostAfter?.lastHeartbeatAt ?? 0;

    check(
      "sendHeartbeat updates lastHeartbeatAt to a newer timestamp",
      "SS-07",
      heartbeatAfter > heartbeatBefore,
      `Before: ${heartbeatBefore}, after: ${heartbeatAfter} — expected after > before`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-08: Set logged for user A appears in session set feed
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-08: Set logged for user A appears in set feed ─────\n",
    );

    // Get the host's workout (created during session creation)
    const hostParticipantDoc = participantsAfter.find(
      (p: any) => p.userId === TEST_HOST,
    );
    const hostWorkoutId = hostParticipantDoc!.workoutId;

    // Get an exercise to log a set with
    const allExercises = await client.query(api.exercises.listExercises, {});
    if (allExercises.length < 1) {
      throw new Error(
        `Need at least 1 exercise in library, got ${allExercises.length}`,
      );
    }
    const exercise = allExercises[0]!;
    console.log(`  Using exercise: ${exercise.name} (${exercise._id})\n`);

    // Add exercise and log a set for host
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

    // Query session sets
    const sessionSets1 = await client.query(api.testing.testGetSessionSets, {
      sessionId,
    });

    // Find host's entry in the set feed
    const hostSets = sessionSets1.find(
      (ps: any) => ps.participantUserId === TEST_HOST,
    );
    const hostSetCount =
      hostSets?.exercises.reduce(
        (acc: number, ex: any) => acc + ex.sets.length,
        0,
      ) ?? 0;

    check(
      "Host's logged set appears in session set feed",
      "SS-08",
      hostSets !== undefined && hostSetCount === 1,
      `Expected host entry with 1 set, got hostSets=${hostSets !== undefined}, setCount=${hostSetCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-09: Sets from both participants appear in session set feed
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-09: Sets from both participants in set feed ───────\n",
    );

    // Get user B's workout
    const userBParticipant = participantsAfter.find(
      (p: any) => p.userId === TEST_USER_B,
    );
    const userBWorkoutId = userBParticipant!.workoutId;

    // Add exercise and log a set for user B
    const userBWE = await client.mutation(api.testing.testAddExercise, {
      testUserId: TEST_USER_B,
      workoutId: userBWorkoutId,
      exerciseId: exercise._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: TEST_USER_B,
      workoutExerciseId: userBWE,
      weight: 80,
      reps: 10,
    });

    // Query session sets again
    const sessionSets2 = await client.query(api.testing.testGetSessionSets, {
      sessionId,
    });

    const hostEntry = sessionSets2.find(
      (ps: any) => ps.participantUserId === TEST_HOST,
    );
    const userBEntry = sessionSets2.find(
      (ps: any) => ps.participantUserId === TEST_USER_B,
    );

    const hostHasSets =
      hostEntry !== undefined &&
      hostEntry.exercises.some((ex: any) => ex.sets.length > 0);
    const userBHasSets =
      userBEntry !== undefined &&
      userBEntry.exercises.some((ex: any) => ex.sets.length > 0);

    check(
      "Session set feed contains sets from both host and user B",
      "SS-09",
      sessionSets2.length === 2 && hostHasSets && userBHasSets,
      `Expected 2 entries with sets, got ${sessionSets2.length} entries, hostHasSets=${hostHasSets}, userBHasSets=${userBHasSets}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-10: leaveSession marks participant status as "left"
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-10: leaveSession marks participant as 'left' ──────\n",
    );

    await client.mutation(api.testing.testLeaveSession, {
      testUserId: TEST_USER_B,
      sessionId,
    });

    const participantsAfterLeave = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    const userBAfterLeave = participantsAfterLeave.find(
      (p: any) => p.userId === TEST_USER_B,
    );

    check(
      "User B's status is 'left' after leaveSession, still in participant list",
      "SS-10",
      participantsAfterLeave.length === 2 &&
        userBAfterLeave !== undefined &&
        userBAfterLeave.status === "left",
      `Expected 2 participants with user B status="left", got ${participantsAfterLeave.length} participants, userB status="${userBAfterLeave?.status}"`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-11: cleanupPresence marks stale participants as "idle"
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-11: cleanupPresence marks stale participants idle ─\n",
    );

    // Set host's lastHeartbeatAt to 60 seconds ago (well past 30s threshold)
    const staleTimestamp = Date.now() - 60_000;
    await client.mutation(api.testing.testSetParticipantHeartbeat, {
      testUserId: TEST_HOST,
      sessionId,
      lastHeartbeatAt: staleTimestamp,
    });

    // Run cleanup
    const cleanupResult = await client.mutation(
      api.testing.testCleanupPresence,
      {},
    );

    // Check host status after cleanup
    const participantsAfterCleanup = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId },
    );

    const hostAfterCleanup = participantsAfterCleanup.find(
      (p: any) => p.userId === TEST_HOST,
    );

    check(
      "Host's status becomes 'idle' after cleanup with stale heartbeat",
      "SS-11",
      hostAfterCleanup !== undefined && hostAfterCleanup.status === "idle",
      `Expected host status="idle", got "${hostAfterCleanup?.status}", cleanup result: scanned=${cleanupResult.sessionsScanned}, idle=${cleanupResult.idleCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SS-12: Session full (max 10) — 11th join rejected
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SS-12: Session full — 11th join rejected ─────────────\n",
    );

    // Create a fresh session for the cap test
    const capSession = await client.mutation(api.testing.testCreateSession, {
      testUserId: TEST_USER_C,
    });
    const capSessionId = capSession.sessionId;
    const capInviteCode = capSession.inviteCode;

    // Join 9 more users (cap-1 through cap-9), making 10 total (host + 9)
    for (let i = 1; i <= 9; i++) {
      await client.mutation(api.testing.testJoinSession, {
        testUserId: `test-session-cap-${i}`,
        inviteCode: capInviteCode,
      });
    }

    // Verify we have 10 participants
    const capParticipants = await client.query(
      api.testing.testGetSessionParticipants,
      { sessionId: capSessionId },
    );

    // Attempt 11th join — expect error
    let capError = "";
    try {
      await client.mutation(api.testing.testJoinSession, {
        testUserId: `test-session-cap-10`,
        inviteCode: capInviteCode,
      });
    } catch (err: any) {
      capError = err.message || String(err);
    }

    check(
      "11th join attempt rejected with 'Session full' error",
      "SS-12",
      capParticipants.length === 10 && capError.includes("Session full"),
      `Participant count: ${capParticipants.length}, error: "${capError}"`,
    );
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    console.log(
      "\n── Cleanup ──────────────────────────────────────────────\n",
    );
    for (const userId of ALL_CLEANUP_USERS) {
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
