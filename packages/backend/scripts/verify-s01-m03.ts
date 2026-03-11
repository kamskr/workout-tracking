#!/usr/bin/env npx tsx
/**
 * S01-M03 Backend Verification Script
 *
 * Exercises the Convex profile CRUD functions programmatically to verify:
 *   R015 — Profile CRUD (create, get by userId, get by username)
 *   R015 — Username uniqueness (case-insensitive collision rejected)
 *   R015 — Username format validation (too short, invalid chars rejected)
 *   R015 — Profile update (displayName, bio changes)
 *   R015 — Profile stats accuracy (totalWorkouts, totalVolume, topExercises)
 *   R015 — Current streak computation
 *   R015 — Search profiles by displayName
 *   R015 — Cross-user profile read (user B reads user A's profile)
 *   R015 — Nonexistent profile returns null
 *
 * Uses two test users (`test-m03-s01-user-a` and `test-m03-s01-user-b`)
 * to prove cross-user profile reads — the first multi-user test scenario
 * in the codebase (D079).
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s01-m03.ts
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

const USER_A = "test-m03-s01-user-a";
const USER_B = "test-m03-s01-user-b";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  // ── Cleanup on entry ──────────────────────────────────────────────────
  console.log("── Cleanup (entry) ──────────────────────────────────────\n");
  await client.mutation(api.testing.testCleanup, { testUserId: USER_A });
  await client.mutation(api.testing.testCleanup, { testUserId: USER_B });
  console.log("  ✓ Cleaned up user A and user B test data\n");

  try {
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "── P-01: Create profile for user A ─────────────────────\n",
    );

    const profileA = await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_A,
      username: "AlphaUser",
      displayName: "Alpha User",
      bio: "Test bio",
    });

    check(
      "P-01: Create profile for user A",
      "R015",
      profileA != null &&
        profileA.username === "AlphaUser" &&
        profileA.displayName === "Alpha User" &&
        profileA.bio === "Test bio" &&
        profileA.isPublic === true &&
        profileA.usernameLower === "alphauser" &&
        profileA.userId === USER_A &&
        typeof profileA.createdAt === "number",
      `Expected profile with correct fields, got: username=${profileA?.username}, displayName=${profileA?.displayName}, bio=${profileA?.bio}, isPublic=${profileA?.isPublic}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-02: Get profile by userId ──────────────────────────\n",
    );

    const fetchedByUserId = await client.query(api.testing.testGetProfile, {
      testUserId: USER_A,
    });

    check(
      "P-02: Get profile by userId returns correct data",
      "R015",
      fetchedByUserId != null &&
        fetchedByUserId.username === "AlphaUser" &&
        fetchedByUserId.displayName === "Alpha User" &&
        fetchedByUserId.bio === "Test bio" &&
        fetchedByUserId.isPublic === true,
      `Expected matching profile, got: ${JSON.stringify(fetchedByUserId)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-03: Get profile by username (case-insensitive) ────\n",
    );

    const fetchedByUsername = await client.query(
      api.testing.testGetProfileByUsername,
      { username: "AlphaUser" },
    );

    const fetchedByUsernameLower = await client.query(
      api.testing.testGetProfileByUsername,
      { username: "alphauser" },
    );

    check(
      "P-03: Get profile by username (case-insensitive lookup)",
      "R015",
      fetchedByUsername != null &&
        fetchedByUsername.username === "AlphaUser" &&
        fetchedByUsernameLower != null &&
        fetchedByUsernameLower.username === "AlphaUser" &&
        fetchedByUsername._id === fetchedByUsernameLower._id,
      `Expected same profile for "AlphaUser" and "alphauser", got ids: ${fetchedByUsername?._id} vs ${fetchedByUsernameLower?._id}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-04: Username uniqueness (case-insensitive) ────────\n",
    );

    let p04Passed = false;
    let p04Detail = "";
    try {
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: USER_B,
        username: "alphauser",
        displayName: "Should Fail",
      });
      p04Detail = "Expected 'Username already taken' error but mutation succeeded";
    } catch (err: any) {
      if (err.message.includes("Username already taken")) {
        p04Passed = true;
        p04Detail = "Correctly rejected with 'Username already taken'";
      } else {
        p04Detail = `Expected 'Username already taken' error, got: ${err.message}`;
      }
    }

    check("P-04: Case-insensitive username uniqueness", "R015", p04Passed, p04Detail);

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-05: Username format validation ────────────────────\n",
    );

    let p05TooShort = false;
    let p05InvalidChars = false;
    let p05Detail = "";

    // Too short (2 chars)
    try {
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: USER_B,
        username: "ab",
        displayName: "Should Fail",
      });
      p05Detail += "Short username accepted (should have been rejected). ";
    } catch (err: any) {
      if (
        err.message.includes(
          "Username must be 3-30 characters, alphanumeric and underscores only",
        )
      ) {
        p05TooShort = true;
      } else {
        p05Detail += `Short username error: ${err.message}. `;
      }
    }

    // Invalid characters
    try {
      await client.mutation(api.testing.testCreateProfile, {
        testUserId: USER_B,
        username: "invalid name!",
        displayName: "Should Fail",
      });
      p05Detail += "Invalid chars username accepted (should have been rejected). ";
    } catch (err: any) {
      if (
        err.message.includes(
          "Username must be 3-30 characters, alphanumeric and underscores only",
        )
      ) {
        p05InvalidChars = true;
      } else {
        p05Detail += `Invalid chars error: ${err.message}. `;
      }
    }

    check(
      "P-05: Username format validation (too short + invalid chars)",
      "R015",
      p05TooShort && p05InvalidChars,
      p05Detail || "Both validation cases correctly rejected",
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-06: Duplicate profile returns existing ─────────────\n",
    );

    const duplicateProfile = await client.mutation(
      api.testing.testCreateProfile,
      {
        testUserId: USER_A,
        username: "DifferentName",
        displayName: "Different",
      },
    );

    check(
      "P-06: Duplicate profile for same user returns existing (idempotent)",
      "R015",
      duplicateProfile != null &&
        duplicateProfile._id === profileA._id &&
        duplicateProfile.username === "AlphaUser",
      `Expected existing profile with id=${profileA._id} and username=AlphaUser, got id=${duplicateProfile?._id} username=${duplicateProfile?.username}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-07: Update profile ─────────────────────────────────\n",
    );

    await client.mutation(api.testing.testUpdateProfile, {
      testUserId: USER_A,
      displayName: "Updated Name",
      bio: "New bio",
    });

    const updatedProfile = await client.query(api.testing.testGetProfile, {
      testUserId: USER_A,
    });

    check(
      "P-07: Update profile persists displayName and bio changes",
      "R015",
      updatedProfile != null &&
        updatedProfile.displayName === "Updated Name" &&
        updatedProfile.bio === "New bio" &&
        updatedProfile.username === "AlphaUser",
      `Expected displayName="Updated Name", bio="New bio", username unchanged. Got: displayName=${updatedProfile?.displayName}, bio=${updatedProfile?.bio}, username=${updatedProfile?.username}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-08: Profile stats with workout data ───────────────\n",
    );

    // Create a workout with exercise and sets for user A to generate stats
    const allExercises = await client.query(api.exercises.listExercises, {});
    const exercise1 = allExercises[0]!;

    const workoutId = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "Stats Test Workout",
    });

    const we1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId,
      exerciseId: exercise1._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: we1Id,
      weight: 80,
      reps: 10,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: we1Id,
      weight: 85,
      reps: 8,
    });

    await sleep(1000);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: workoutId,
    });

    const stats = await client.query(api.testing.testGetProfileStats, {
      testUserId: USER_A,
    });

    check(
      "P-08: Profile stats reflect workout data",
      "R015",
      stats != null &&
        stats.totalWorkouts >= 1 &&
        stats.totalVolume > 0 &&
        stats.topExercises.length >= 1,
      `Expected totalWorkouts>=1, totalVolume>0, topExercises.length>=1. Got: totalWorkouts=${stats?.totalWorkouts}, totalVolume=${stats?.totalVolume}, topExercises.length=${stats?.topExercises?.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-09: Current streak computation ────────────────────\n",
    );

    check(
      "P-09: Current streak is a non-negative number",
      "R015",
      stats != null &&
        typeof stats.currentStreak === "number" &&
        stats.currentStreak >= 0,
      `Expected currentStreak to be a non-negative number, got: ${stats?.currentStreak} (type: ${typeof stats?.currentStreak})`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-10: Search profiles ────────────────────────────────\n",
    );

    const searchResults = await client.query(api.testing.testSearchProfiles, {
      searchTerm: "Updated",
    });

    const foundUserA = searchResults.some(
      (r: any) => r.userId === USER_A && r.displayName === "Updated Name",
    );

    check(
      "P-10: Search profiles finds user A by updated displayName",
      "R015",
      searchResults.length >= 1 && foundUserA,
      `Expected search for "Updated" to return user A. Got ${searchResults.length} results, foundUserA=${foundUserA}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-11: Cross-user profile read ────────────────────────\n",
    );

    // Create profile for user B with a different username
    const profileB = await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_B,
      username: "BetaUser",
      displayName: "Beta User",
      bio: "Beta bio",
    });

    // User B reads user A's profile by username
    const userBReadsA = await client.query(
      api.testing.testGetProfileByUsername,
      { username: "AlphaUser" },
    );

    // User A reads user B's profile by username
    const userAReadsB = await client.query(
      api.testing.testGetProfileByUsername,
      { username: "BetaUser" },
    );

    check(
      "P-11: Cross-user profile reads work both ways",
      "R015",
      userBReadsA != null &&
        userBReadsA.userId === USER_A &&
        userBReadsA.username === "AlphaUser" &&
        userAReadsB != null &&
        userAReadsB.userId === USER_B &&
        userAReadsB.username === "BetaUser",
      `Expected cross-user reads to return correct profiles. userBReadsA.userId=${userBReadsA?.userId}, userAReadsB.userId=${userAReadsB?.userId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── P-12: Nonexistent profile returns null ───────────────\n",
    );

    const nonexistent = await client.query(
      api.testing.testGetProfileByUsername,
      { username: "nonexistent_xyz_999" },
    );

    check(
      "P-12: Nonexistent profile returns null (no crash)",
      "R015",
      nonexistent === null,
      `Expected null for nonexistent username, got: ${JSON.stringify(nonexistent)}`,
    );
  } finally {
    // ── Cleanup (exit) ──────────────────────────────────────────────────
    console.log("\n── Cleanup (exit) ───────────────────────────────────────\n");
    try {
      await client.mutation(api.testing.testCleanup, { testUserId: USER_A });
      await client.mutation(api.testing.testCleanup, { testUserId: USER_B });
      console.log("  ✓ Cleaned up user A and user B test data");
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
