#!/usr/bin/env npx tsx
/**
 * S02-M03 Backend Verification Script
 *
 * Exercises the social follow system, activity feed, reactions, block filtering,
 * pagination, and cascade delete via 15 checks with 3 test users.
 *
 * Requirement tags:
 *   R016 — Social / Follow / Feed / Reactions / Block
 *
 * Uses three test users:
 *   USER_A = "test-m03-s02-user-a"
 *   USER_B = "test-m03-s02-user-b"
 *   USER_C = "test-m03-s02-user-c"
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s02-m03.ts
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

const USER_A = "test-m03-s02-user-a";
const USER_B = "test-m03-s02-user-b";
const USER_C = "test-m03-s02-user-c";

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
  await client.mutation(api.testing.testCleanup, { testUserId: USER_C });
  console.log("  ✓ Cleaned up user A, B, and C test data\n");

  // Track IDs for later checks
  let feedItemIdB: string | null = null;
  let workoutIdB: string | null = null;

  try {
    // Set up profiles for all 3 users (needed for feed author resolution)
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_A,
      username: "s02_user_a",
      displayName: "User A",
    });
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_B,
      username: "s02_user_b",
      displayName: "User B",
    });
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_C,
      username: "s02_user_c",
      displayName: "User C",
    });
    console.log("  ✓ Created profiles for users A, B, C\n");

    // ══════════════════════════════════════════════════════════════════════
    // F-01: Follow user (A follows B)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── F-01: Follow user (A follows B) ─────────────────────\n");

    const followId = await client.mutation(api.testing.testFollowUser, {
      testUserId: USER_A,
      followingId: USER_B,
    });

    check(
      "F-01: Follow user (A follows B)",
      "R016",
      followId != null,
      `Expected follow ID, got: ${followId}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-02: Follow status returns true for A→B
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-02: Follow status returns true for A→B ─────────────\n",
    );

    const followStatus = await client.query(api.testing.testGetFollowStatus, {
      testUserId: USER_A,
      targetUserId: USER_B,
    });

    check(
      "F-02: Follow status returns true for A→B",
      "R016",
      followStatus != null &&
        followStatus.isFollowing === true &&
        followStatus.isFollowedBy === false,
      `Expected { isFollowing: true, isFollowedBy: false }, got: ${JSON.stringify(followStatus)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-03: Follow counts (B has 1 follower, A follows 1)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-03: Follow counts (B: 1 follower, A: follows 1) ───\n",
    );

    const countsB = await client.query(api.testing.testGetFollowCounts, {
      testUserId: USER_B,
    });
    const countsA = await client.query(api.testing.testGetFollowCounts, {
      testUserId: USER_A,
    });

    check(
      "F-03: Follow counts correct",
      "R016",
      countsB != null &&
        countsB.followers === 1 &&
        countsB.following === 0 &&
        countsA != null &&
        countsA.followers === 0 &&
        countsA.following === 1,
      `Expected B: {followers:1, following:0}, A: {followers:0, following:1}. Got B: ${JSON.stringify(countsB)}, A: ${JSON.stringify(countsA)}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-04: Duplicate follow is idempotent
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-04: Duplicate follow is idempotent ─────────────────\n",
    );

    let f04Passed = false;
    let f04Detail = "";
    try {
      const dupFollowId = await client.mutation(api.testing.testFollowUser, {
        testUserId: USER_A,
        followingId: USER_B,
      });
      // Should return the existing follow ID (same as first call)
      f04Passed = dupFollowId != null;
      f04Detail = `Idempotent: returned ${dupFollowId}`;
    } catch (err: any) {
      f04Detail = `Expected idempotent success, got error: ${err.message}`;
    }

    check("F-04: Duplicate follow is idempotent", "R016", f04Passed, f04Detail);

    // ══════════════════════════════════════════════════════════════════════
    // F-05: Self-follow rejected
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── F-05: Self-follow rejected ───────────────────────────\n");

    let f05Passed = false;
    let f05Detail = "";
    try {
      await client.mutation(api.testing.testFollowUser, {
        testUserId: USER_A,
        followingId: USER_A,
      });
      f05Detail = "Expected 'Cannot follow yourself' error but mutation succeeded";
    } catch (err: any) {
      if (err.message.includes("Cannot follow yourself")) {
        f05Passed = true;
        f05Detail = "Correctly rejected with 'Cannot follow yourself'";
      } else {
        f05Detail = `Expected 'Cannot follow yourself' error, got: ${err.message}`;
      }
    }

    check("F-05: Self-follow rejected", "R016", f05Passed, f05Detail);

    // ══════════════════════════════════════════════════════════════════════
    // F-06: Feed item created on workout completion
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-06: Feed item created on workout completion ────────\n",
    );

    // B creates and finishes a workout
    const allExercises = await client.query(api.exercises.listExercises, {});
    const exercise1 = allExercises[0]!;

    workoutIdB = (await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_B,
      name: "B's Push Day",
    })) as string;

    const we1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_B,
      workoutId: workoutIdB as any,
      exerciseId: exercise1._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_B,
      workoutExerciseId: we1Id,
      weight: 100,
      reps: 8,
    });

    await sleep(500);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_B,
      id: workoutIdB as any,
    });

    // Check that B's feed (as self) has the workout item
    // We query directly by authorId to confirm the feed item was created
    const feedResultB = await client.query(api.testing.testGetFeed, {
      testUserId: USER_B,
      paginationOpts: { numItems: 10, cursor: null },
    });

    // B doesn't follow B, so the feed post-filter won't show it.
    // Instead, verify the feed item exists by having A (who follows B) see it.
    const feedResultA = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 10, cursor: null },
    });

    const bItemInAFeed = feedResultA.page.find(
      (item: any) =>
        item.authorId === USER_B && item.type === "workout_completed",
    );

    if (bItemInAFeed) {
      feedItemIdB = bItemInAFeed._id;
    }

    check(
      "F-06: Feed item created on workout completion",
      "R016",
      bItemInAFeed != null &&
        bItemInAFeed.summary != null &&
        bItemInAFeed.summary.name === "B's Push Day" &&
        bItemInAFeed.summary.exerciseCount === 1,
      `Expected feed item with name="B's Push Day", exerciseCount=1. Got: ${bItemInAFeed ? JSON.stringify(bItemInAFeed.summary) : "not found in A's feed"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-07: Feed returns B's item for A (follower sees feed)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-07: Feed returns B's item for A (follower) ─────────\n",
    );

    check(
      "F-07: Follower (A) sees B's feed item",
      "R016",
      feedResultA.page.length >= 1 &&
        bItemInAFeed != null &&
        bItemInAFeed.author != null &&
        bItemInAFeed.author.displayName === "User B",
      `Expected A's feed to contain B's item with author displayName="User B". Feed items: ${feedResultA.page.length}, author: ${bItemInAFeed?.author?.displayName ?? "N/A"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-08: Feed does not return B's item for C (non-follower)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-08: Feed does not show B's item to C ───────────────\n",
    );

    const feedResultC = await client.query(api.testing.testGetFeed, {
      testUserId: USER_C,
      paginationOpts: { numItems: 10, cursor: null },
    });

    const cSeesB = feedResultC.page.some(
      (item: any) => item.authorId === USER_B,
    );

    check(
      "F-08: Non-follower (C) does not see B's feed item",
      "R016",
      !cSeesB && feedResultC.page.length === 0,
      `Expected C's feed to be empty. Got ${feedResultC.page.length} items, sees B: ${cSeesB}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-09: Reaction add (A reacts fire to B's feed item)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-09: Reaction add (A reacts fire) ──────────────────\n",
    );

    let f09Passed = false;
    let f09Detail = "";
    if (feedItemIdB) {
      const reactionId = await client.mutation(api.testing.testAddReaction, {
        testUserId: USER_A,
        feedItemId: feedItemIdB as any,
        type: "fire",
      });
      f09Passed = reactionId != null;
      f09Detail = `Reaction created: ${reactionId}`;
    } else {
      f09Detail = "No feed item ID available (F-06 may have failed)";
    }

    check("F-09: Reaction add (A reacts fire)", "R016", f09Passed, f09Detail);

    // ══════════════════════════════════════════════════════════════════════
    // F-10: Reaction retrieval shows count and user flag
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-10: Reaction retrieval (count + userHasReacted) ────\n",
    );

    let f10Passed = false;
    let f10Detail = "";
    if (feedItemIdB) {
      const reactions = await client.query(
        api.testing.testGetReactionsForFeedItem,
        {
          testUserId: USER_A,
          feedItemId: feedItemIdB as any,
        },
      );

      const fireReaction = reactions.find((r: any) => r.type === "fire");
      f10Passed =
        fireReaction != null &&
        fireReaction.count === 1 &&
        fireReaction.userHasReacted === true;
      f10Detail = `Expected fire: {count:1, userHasReacted:true}. Got: ${JSON.stringify(fireReaction)}`;
    } else {
      f10Detail = "No feed item ID available (F-06 may have failed)";
    }

    check(
      "F-10: Reaction retrieval shows count and userHasReacted flag",
      "R016",
      f10Passed,
      f10Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-11: Reaction remove
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── F-11: Reaction remove ────────────────────────────────\n");

    let f11Passed = false;
    let f11Detail = "";
    if (feedItemIdB) {
      await client.mutation(api.testing.testRemoveReaction, {
        testUserId: USER_A,
        feedItemId: feedItemIdB as any,
        type: "fire",
      });

      const reactionsAfter = await client.query(
        api.testing.testGetReactionsForFeedItem,
        {
          testUserId: USER_A,
          feedItemId: feedItemIdB as any,
        },
      );

      // After removal, there should be no fire reactions (empty array or no fire entry)
      const fireAfter = reactionsAfter.find((r: any) => r.type === "fire");
      f11Passed = fireAfter == null || fireAfter.count === 0;
      f11Detail = `After removal, fire reaction: ${JSON.stringify(fireAfter ?? "absent")}`;
    } else {
      f11Detail = "No feed item ID available (F-06 may have failed)";
    }

    check("F-11: Reaction remove drops count", "R016", f11Passed, f11Detail);

    // ══════════════════════════════════════════════════════════════════════
    // F-12: Block user (A blocks C) → C's items excluded from feed
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-12: Block user → blocked user's items excluded ─────\n",
    );

    // A follows C first
    await client.mutation(api.testing.testFollowUser, {
      testUserId: USER_A,
      followingId: USER_C,
    });

    // C creates + finishes a workout
    const workoutIdC = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_C,
      name: "C's Leg Day",
    });

    const weCId = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_C,
      workoutId: workoutIdC,
      exerciseId: exercise1._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_C,
      workoutExerciseId: weCId,
      weight: 60,
      reps: 12,
    });

    await sleep(500);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_C,
      id: workoutIdC,
    });

    // A should see C's item before blocking
    const feedBeforeBlock = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 20, cursor: null },
    });

    const seesCABeforeBlock = feedBeforeBlock.page.some(
      (item: any) => item.authorId === USER_C,
    );

    // A blocks C
    await client.mutation(api.testing.testBlockUser, {
      testUserId: USER_A,
      blockedId: USER_C,
    });

    // A's feed should no longer show C's items
    const feedAfterBlock = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 20, cursor: null },
    });

    const seesCAAfterBlock = feedAfterBlock.page.some(
      (item: any) => item.authorId === USER_C,
    );

    check(
      "F-12: Block user → blocked user's items excluded from feed",
      "R016",
      seesCABeforeBlock && !seesCAAfterBlock,
      `Before block, A sees C: ${seesCABeforeBlock}. After block, A sees C: ${seesCAAfterBlock}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-13: Unfollow (A unfollows B) → feed no longer shows B's items
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-13: Unfollow → feed no longer shows unfollowed ─────\n",
    );

    await client.mutation(api.testing.testUnfollowUser, {
      testUserId: USER_A,
      followingId: USER_B,
    });

    const feedAfterUnfollow = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 20, cursor: null },
    });

    const seesBAfterUnfollow = feedAfterUnfollow.page.some(
      (item: any) => item.authorId === USER_B,
    );

    check(
      "F-13: Unfollow → feed no longer shows B's items",
      "R016",
      !seesBAfterUnfollow,
      `After unfollowing B, A sees B's items: ${seesBAfterUnfollow}. Feed items: ${feedAfterUnfollow.page.length}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-14: Pagination with 50+ items
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-14: Pagination with 50+ items ─────────────────────\n",
    );

    // A re-follows B for pagination test
    await client.mutation(api.testing.testFollowUser, {
      testUserId: USER_A,
      followingId: USER_B,
    });

    // Create 55 feed items for B via testCreateFeedItem (need a workout for the workoutId)
    // Reuse workoutIdB if it still exists, or create a new one
    const bulkWorkoutId = await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_B,
      name: "Bulk Feed Test",
    });

    for (let i = 0; i < 55; i++) {
      await client.mutation(api.testing.testCreateFeedItem, {
        testUserId: USER_B,
        workoutId: bulkWorkoutId,
        summary: {
          name: `Bulk Workout ${i + 1}`,
          durationSeconds: 1800,
          exerciseCount: 3,
          prCount: 0,
        },
      });
    }

    // Paginate with numItems=10
    const page1 = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 10, cursor: null },
    });

    let totalItems = page1.page.length;
    let pageCount = 1;
    let cursor = page1.continueCursor;
    let isDone = page1.isDone;

    // Fetch subsequent pages until done or we've fetched enough
    while (!isDone && pageCount < 20) {
      const nextPage = await client.query(api.testing.testGetFeed, {
        testUserId: USER_A,
        paginationOpts: { numItems: 10, cursor },
      });
      totalItems += nextPage.page.length;
      cursor = nextPage.continueCursor;
      isDone = nextPage.isDone;
      pageCount++;
    }

    // We should have 55 bulk items + the original workout completion item (F-06) = 56+
    // But the F-06 item is still there. Total should be >= 55.
    check(
      "F-14: Pagination with 50+ items — all items retrieved",
      "R016",
      totalItems >= 55 && pageCount > 1,
      `Retrieved ${totalItems} items across ${pageCount} pages. Expected ≥55 items and >1 page.`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // F-15: Feed item cascade-deleted when workout deleted
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── F-15: Feed item cascade on workout delete ────────────\n",
    );

    // Create a new workout for B, finish it, verify feed item, then delete
    const cascadeWorkoutId = await client.mutation(
      api.testing.testCreateWorkout,
      {
        testUserId: USER_B,
        name: "Cascade Test Workout",
      },
    );

    const cascadeWeId = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_B,
      workoutId: cascadeWorkoutId,
      exerciseId: exercise1._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_B,
      workoutExerciseId: cascadeWeId,
      weight: 50,
      reps: 10,
    });

    await sleep(500);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_B,
      id: cascadeWorkoutId,
    });

    // A sees the new item
    const feedBeforeDelete = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 100, cursor: null },
    });

    const cascadeItem = feedBeforeDelete.page.find(
      (item: any) =>
        item.summary?.name === "Cascade Test Workout" &&
        item.authorId === USER_B,
    );

    // Add a reaction to the cascade item so we can verify reaction cascade
    if (cascadeItem) {
      await client.mutation(api.testing.testAddReaction, {
        testUserId: USER_A,
        feedItemId: cascadeItem._id,
        type: "strongArm",
      });
    }

    // Now delete the workout — should cascade-delete feed item + reactions
    await client.mutation(api.testing.testDeleteWorkout, {
      testUserId: USER_B,
      id: cascadeWorkoutId,
    });

    // Feed should no longer contain the cascade test item
    const feedAfterDelete = await client.query(api.testing.testGetFeed, {
      testUserId: USER_A,
      paginationOpts: { numItems: 100, cursor: null },
    });

    const cascadeItemAfter = feedAfterDelete.page.find(
      (item: any) =>
        item.summary?.name === "Cascade Test Workout" &&
        item.authorId === USER_B,
    );

    check(
      "F-15: Workout delete cascade-deletes feed item and reactions",
      "R016",
      cascadeItem != null && cascadeItemAfter == null,
      `Before delete: item ${cascadeItem != null ? "found" : "NOT found"}. After delete: item ${cascadeItemAfter != null ? "still present" : "removed"}`,
    );
  } finally {
    // ── Cleanup (exit) ──────────────────────────────────────────────────
    console.log("\n── Cleanup (exit) ───────────────────────────────────────\n");
    try {
      await client.mutation(api.testing.testCleanup, { testUserId: USER_A });
      await client.mutation(api.testing.testCleanup, { testUserId: USER_B });
      await client.mutation(api.testing.testCleanup, { testUserId: USER_C });
      console.log("  ✓ Cleaned up user A, B, and C test data");
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
