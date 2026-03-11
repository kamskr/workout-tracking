#!/usr/bin/env npx tsx
/**
 * S03-M03 Backend Verification Script
 *
 * Exercises the workout sharing & privacy contract: privacy-aware feed items,
 * share token creation, shared workout retrieval, clone-as-template, privacy
 * toggle cascade, block filtering, and analytics privacy gating.
 *
 * Requirement tags:
 *   R017 — Workout Sharing & Privacy
 *
 * Uses three test users:
 *   USER_A = "test-m03-s03-user-a" — workout author
 *   USER_B = "test-m03-s03-user-b" — follower / cloner
 *   USER_C = "test-m03-s03-user-c" — block target
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s03-m03.ts
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

const USER_A = "test-m03-s03-user-a"; // workout author
const USER_B = "test-m03-s03-user-b"; // follower / cloner
const USER_C = "test-m03-s03-user-c"; // block target

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

  // Track IDs across checks
  let publicWorkoutId: string | null = null;
  let privateWorkoutId: string | null = null;
  let publicFeedItemId: string | null = null;
  let privateFeedItemId: string | null = null;
  let shareFeedItemId: string | null = null;
  let clonedTemplateId: string | null = null;

  try {
    // ── Data setup ────────────────────────────────────────────────────────
    console.log("── Data setup ───────────────────────────────────────────\n");

    // Create profiles for all 3 users
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_A,
      username: "s03_user_a",
      displayName: "User A (Author)",
    });
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_B,
      username: "s03_user_b",
      displayName: "User B (Follower)",
    });
    await client.mutation(api.testing.testCreateProfile, {
      testUserId: USER_C,
      username: "s03_user_c",
      displayName: "User C (Blocked)",
    });
    console.log("  ✓ Created profiles for users A, B, C\n");

    // USER_B follows USER_A
    await client.mutation(api.testing.testFollowUser, {
      testUserId: USER_B,
      followingId: USER_A,
    });
    console.log("  ✓ USER_B follows USER_A\n");

    // Get a seed exercise
    const allExercises = await client.query(api.exercises.listExercises, {});
    const exercise1 = allExercises[0]!;
    const exercise2 = allExercises.length > 1 ? allExercises[1]! : exercise1;
    console.log(`  ✓ Seed exercises: ${exercise1.name}, ${exercise2.name}\n`);

    // ── Create PUBLIC workout for USER_A ────────────────────────────────
    publicWorkoutId = (await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "A's Public Push Day",
      isPublic: true,
    })) as string;

    // Add two exercises with sets to the public workout
    const pubWe1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: publicWorkoutId as any,
      exerciseId: exercise1._id,
    });
    const pubWe2Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: publicWorkoutId as any,
      exerciseId: exercise2._id,
    });

    // Log sets for exercise 1 (3 sets)
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: pubWe1Id,
      weight: 80,
      reps: 10,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: pubWe1Id,
      weight: 85,
      reps: 8,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: pubWe1Id,
      weight: 90,
      reps: 6,
    });

    // Log sets for exercise 2 (2 sets)
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: pubWe2Id,
      weight: 40,
      reps: 12,
    });
    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: pubWe2Id,
      weight: 45,
      reps: 10,
    });

    await sleep(500);

    // Finish public workout
    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: publicWorkoutId as any,
    });
    console.log("  ✓ Created and finished public workout for USER_A\n");

    // ── Create PRIVATE workout for USER_A ───────────────────────────────
    privateWorkoutId = (await client.mutation(api.testing.testCreateWorkout, {
      testUserId: USER_A,
      name: "A's Private Leg Day",
      isPublic: false,
    })) as string;

    const privWe1Id = await client.mutation(api.testing.testAddExercise, {
      testUserId: USER_A,
      workoutId: privateWorkoutId as any,
      exerciseId: exercise1._id,
    });

    await client.mutation(api.testing.testLogSet, {
      testUserId: USER_A,
      workoutExerciseId: privWe1Id,
      weight: 120,
      reps: 5,
    });

    await sleep(500);

    await client.mutation(api.testing.testFinishWorkout, {
      testUserId: USER_A,
      id: privateWorkoutId as any,
    });
    console.log("  ✓ Created and finished private workout for USER_A\n");

    // Small delay for feed propagation
    await sleep(500);

    // ══════════════════════════════════════════════════════════════════════
    // SH-01: Public workout creates feed item with isPublic: true
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "── SH-01: Public workout → feed item with isPublic: true ─\n",
    );

    // USER_B's feed should show the public workout from USER_A
    const feedB = await client.query(api.testing.testGetFeed, {
      testUserId: USER_B,
      paginationOpts: { numItems: 20, cursor: null },
    });

    const publicFeedItem = feedB.page.find(
      (item: any) =>
        item.authorId === USER_A &&
        item.type === "workout_completed" &&
        item.summary?.name === "A's Public Push Day",
    );

    if (publicFeedItem) {
      publicFeedItemId = publicFeedItem._id;
    }

    check(
      "SH-01: Public workout creates feed item with isPublic: true",
      "R017",
      publicFeedItem != null && publicFeedItem.isPublic === true,
      `Expected feed item with isPublic=true for public workout. Got: ${publicFeedItem ? `isPublic=${publicFeedItem.isPublic}` : "not found in B's feed"}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-02: Private workout creates feed item with isPublic: false
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-02: Private workout → feed item with isPublic: false ─\n",
    );

    // Private feed item should NOT appear in B's feed (filtered out by isPublic check)
    const privateFeedItemInB = feedB.page.find(
      (item: any) =>
        item.authorId === USER_A &&
        item.summary?.name === "A's Private Leg Day",
    );

    // Verify directly: query A's own raw feed items (use testCreateFeedItem won't help;
    // instead check the workout's feed items were created with isPublic: false by looking
    // at the feed without the isPublic filter — we'll verify by absence from B's feed)
    check(
      "SH-02: Private workout feed item has isPublic: false (excluded from B's feed)",
      "R017",
      privateFeedItemInB == null,
      `Expected private workout feed item to be excluded from B's feed. Found: ${privateFeedItemInB != null}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-03: Private workout excluded from follower's feed (count check)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-03: Private workout excluded from follower's feed ──\n",
    );

    // B should see exactly 1 item from A (public workout), not 2
    const aItemsInBFeed = feedB.page.filter(
      (item: any) => item.authorId === USER_A,
    );

    check(
      "SH-03: Follower sees only public workout (count=1, not 2)",
      "R017",
      aItemsInBFeed.length === 1 &&
        aItemsInBFeed[0].summary?.name === "A's Public Push Day",
      `Expected 1 item from A in B's feed (public only). Got ${aItemsInBFeed.length} items. Names: ${aItemsInBFeed.map((i: any) => i.summary?.name).join(", ")}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-04: Public workout visible in follower's feed
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-04: Public workout visible in follower's feed ──────\n",
    );

    check(
      "SH-04: Public workout visible in follower's feed",
      "R017",
      publicFeedItem != null &&
        publicFeedItem.author?.displayName === "User A (Author)" &&
        publicFeedItem.summary?.exerciseCount === 2,
      `Expected public workout in B's feed with author="User A (Author)", exerciseCount=2. Got: author=${publicFeedItem?.author?.displayName}, exerciseCount=${publicFeedItem?.summary?.exerciseCount}`,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-05: testShareWorkout creates workout_shared feed item
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-05: testShareWorkout creates workout_shared feed item ─\n",
    );

    let sh05Passed = false;
    let sh05Detail = "";
    try {
      shareFeedItemId = (await client.mutation(api.testing.testShareWorkout, {
        testUserId: USER_A,
        workoutId: publicWorkoutId as any,
      })) as string;

      sh05Passed = shareFeedItemId != null;
      sh05Detail = `Created share feed item: ${shareFeedItemId}`;
    } catch (err: any) {
      sh05Detail = `shareWorkout threw: ${err.message}`;
    }

    check(
      "SH-05: testShareWorkout creates workout_shared feed item, returns feedItemId",
      "R017",
      sh05Passed,
      sh05Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-06: testGetSharedWorkout returns full workout detail
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-06: testGetSharedWorkout returns full workout detail ─\n",
    );

    let sh06Passed = false;
    let sh06Detail = "";
    if (shareFeedItemId) {
      try {
        const shared = await client.query(api.testing.testGetSharedWorkout, {
          feedItemId: shareFeedItemId as any,
        });

        sh06Passed =
          shared != null &&
          shared.workout != null &&
          shared.exercises != null &&
          shared.exercises.length === 2 &&
          shared.author != null &&
          shared.author.displayName === "User A (Author)" &&
          shared.exercises.some(
            (e: any) => e.sets != null && e.sets.length > 0,
          );
        sh06Detail = `workout: ${shared?.workout?.name}, exercises: ${shared?.exercises?.length}, author: ${shared?.author?.displayName}, hasSets: ${shared?.exercises?.some((e: any) => e.sets?.length > 0)}`;
      } catch (err: any) {
        sh06Detail = `getSharedWorkout threw: ${err.message}`;
      }
    } else {
      sh06Detail = "No share feed item ID (SH-05 may have failed)";
    }

    check(
      "SH-06: testGetSharedWorkout returns full workout detail (exercises, sets, author)",
      "R017",
      sh06Passed,
      sh06Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-07: testGetSharedWorkout for private workout returns null
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-07: testGetSharedWorkout for private workout → null ─\n",
    );

    let sh07Passed = false;
    let sh07Detail = "";

    // Create a feed item for the private workout manually (simulating
    // a scenario where a feed item exists but the workout is private)
    try {
      const privateFeedId = await client.mutation(
        api.testing.testCreateFeedItem,
        {
          testUserId: USER_A,
          workoutId: privateWorkoutId as any,
          summary: {
            name: "A's Private Leg Day",
            durationSeconds: 1800,
            exerciseCount: 1,
            prCount: 0,
          },
          isPublic: false,
        },
      );
      privateFeedItemId = privateFeedId as string;

      const shared = await client.query(api.testing.testGetSharedWorkout, {
        feedItemId: privateFeedId as any,
      });

      sh07Passed = shared === null;
      sh07Detail = `Expected null for private workout, got: ${shared === null ? "null" : JSON.stringify(shared?.workout?.name)}`;
    } catch (err: any) {
      sh07Detail = `Unexpected error: ${err.message}`;
    }

    check(
      "SH-07: testGetSharedWorkout for private workout returns null",
      "R017",
      sh07Passed,
      sh07Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-08: testCloneAsTemplate creates template owned by USER_B
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-08: testCloneAsTemplate creates template for USER_B ─\n",
    );

    let sh08Passed = false;
    let sh08Detail = "";
    if (shareFeedItemId) {
      try {
        clonedTemplateId = (await client.mutation(
          api.testing.testCloneAsTemplate,
          {
            testUserId: USER_B,
            feedItemId: shareFeedItemId as any,
            name: "Cloned Push Day",
          },
        )) as string;

        // Verify the template
        const template = await client.query(
          api.testing.testGetTemplateWithExercises,
          {
            testUserId: USER_B,
            templateId: clonedTemplateId as any,
          },
        );

        const exerciseCount = template.exercises.length;
        // Source workout had exercise1 with 3 sets and exercise2 with 2 sets
        const firstExercise = template.exercises[0];
        const hasTargetSets =
          firstExercise?.templateExercise?.targetSets != null;
        const hasTargetReps =
          firstExercise?.templateExercise?.targetReps != null;

        sh08Passed =
          template.template.userId === USER_B &&
          exerciseCount === 2 &&
          hasTargetSets &&
          hasTargetReps &&
          firstExercise.templateExercise.targetSets === 3 && // 3 sets for exercise1
          firstExercise.templateExercise.targetReps === 10; // first set reps for exercise1

        sh08Detail = `owner=${template.template.userId}, exercises=${exerciseCount}, targetSets=${firstExercise?.templateExercise?.targetSets}, targetReps=${firstExercise?.templateExercise?.targetReps}`;
      } catch (err: any) {
        sh08Detail = `cloneAsTemplate threw: ${err.message}`;
      }
    } else {
      sh08Detail = "No share feed item ID (SH-05 may have failed)";
    }

    check(
      "SH-08: testCloneAsTemplate creates template owned by USER_B with correct exercise count/targets",
      "R017",
      sh08Passed,
      sh08Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-09: testCloneAsTemplate for private workout rejects
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-09: testCloneAsTemplate for private workout rejects ─\n",
    );

    let sh09Passed = false;
    let sh09Detail = "";
    if (privateFeedItemId) {
      try {
        await client.mutation(api.testing.testCloneAsTemplate, {
          testUserId: USER_B,
          feedItemId: privateFeedItemId as any,
          name: "Should Fail Clone",
        });
        sh09Detail =
          "Expected error for private workout clone, but mutation succeeded";
      } catch (err: any) {
        if (err.message.includes("Shared workout not available")) {
          sh09Passed = true;
          sh09Detail = `Correctly rejected: "${err.message}"`;
        } else {
          sh09Detail = `Expected "Shared workout not available" error, got: ${err.message}`;
        }
      }
    } else {
      sh09Detail = "No private feed item ID (SH-07 setup may have failed)";
    }

    check(
      "SH-09: testCloneAsTemplate rejects private workout",
      "R017",
      sh09Passed,
      sh09Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-10: testToggleWorkoutPrivacy flips isPublic + cascades
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-10: testToggleWorkoutPrivacy flips + cascades ──────\n",
    );

    let sh10Passed = false;
    let sh10Detail = "";
    if (publicWorkoutId) {
      try {
        // Toggle public workout to private
        await client.mutation(api.testing.testToggleWorkoutPrivacy, {
          testUserId: USER_A,
          workoutId: publicWorkoutId as any,
          isPublic: false,
        });

        // Verify workout is now private
        const updatedWorkout = await client.query(
          api.testing.testGetWorkoutWithDetails,
          {
            testUserId: USER_A,
            id: publicWorkoutId as any,
          },
        );

        // Verify feed item cascade: B should no longer see the workout
        const feedAfterToggle = await client.query(api.testing.testGetFeed, {
          testUserId: USER_B,
          paginationOpts: { numItems: 20, cursor: null },
        });

        const publicItemAfterToggle = feedAfterToggle.page.find(
          (item: any) =>
            item.authorId === USER_A &&
            item.summary?.name === "A's Public Push Day",
        );

        sh10Passed =
          updatedWorkout.workout.isPublic === false &&
          publicItemAfterToggle == null;
        sh10Detail = `workout.isPublic=${updatedWorkout.workout.isPublic}, feedItemStillVisible=${publicItemAfterToggle != null}`;

        // Toggle back to public for subsequent checks
        await client.mutation(api.testing.testToggleWorkoutPrivacy, {
          testUserId: USER_A,
          workoutId: publicWorkoutId as any,
          isPublic: true,
        });
      } catch (err: any) {
        sh10Detail = `toggleWorkoutPrivacy threw: ${err.message}`;
      }
    } else {
      sh10Detail = "No public workout ID (data setup may have failed)";
    }

    check(
      "SH-10: testToggleWorkoutPrivacy flips isPublic on workout AND feed items",
      "R017",
      sh10Passed,
      sh10Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-11: Profile stats exclude private workout
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-11: Profile stats exclude private workout ──────────\n",
    );

    let sh11Passed = false;
    let sh11Detail = "";
    try {
      const stats = await client.query(api.testing.testGetProfileStats, {
        testUserId: USER_A,
      });

      // USER_A has 2 completed workouts (public + private), but profile stats
      // with includePrivate=false should count only the public one.
      // Public workout: exercise1 (80*10 + 85*8 + 90*6) + exercise2 (40*12 + 45*10)
      //                = (800 + 680 + 540) + (480 + 450) = 2020 + 930 = 2950
      // Private workout: exercise1 (120*5) = 600
      // With includePrivate=false: workoutCount=1, totalVolume=2950
      sh11Passed = stats.totalWorkouts === 1;
      sh11Detail = `totalWorkouts=${stats.totalWorkouts} (expected 1), totalVolume=${stats.totalVolume}`;
    } catch (err: any) {
      sh11Detail = `testGetProfileStats threw: ${err.message}`;
    }

    check(
      "SH-11: Profile stats (includePrivate=false) exclude private workout from workoutCount",
      "R017",
      sh11Passed,
      sh11Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-12: Analytics summary includes ALL workouts (private + public)
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-12: Analytics summary includes all workouts ────────\n",
    );

    let sh12Passed = false;
    let sh12Detail = "";
    try {
      const weekly = await client.query(api.testing.testGetWeeklySummary, {
        testUserId: USER_A,
      });

      // testGetWeeklySummary uses includePrivate=true, so both workouts should be counted
      sh12Passed = weekly.workoutCount === 2;
      sh12Detail = `workoutCount=${weekly.workoutCount} (expected 2), totalVolume=${weekly.totalVolume}`;
    } catch (err: any) {
      sh12Detail = `testGetWeeklySummary threw: ${err.message}`;
    }

    check(
      "SH-12: Analytics summary (includePrivate=true) includes all workouts",
      "R017",
      sh12Passed,
      sh12Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-13: Blocked user cannot view shared workout
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-13: Blocked user cannot view shared workout ────────\n",
    );

    let sh13Passed = false;
    let sh13Detail = "";
    if (shareFeedItemId) {
      try {
        // USER_A blocks USER_C
        await client.mutation(api.testing.testBlockUser, {
          testUserId: USER_A,
          blockedId: USER_C,
        });

        // USER_C tries to view A's shared workout
        const sharedForC = await client.query(
          api.testing.testGetSharedWorkout,
          {
            feedItemId: shareFeedItemId as any,
            testCallerId: USER_C,
          },
        );

        sh13Passed = sharedForC === null;
        sh13Detail = `Expected null for blocked user, got: ${sharedForC === null ? "null" : "non-null (workout visible)"}`;
      } catch (err: any) {
        sh13Detail = `Unexpected error: ${err.message}`;
      }
    } else {
      sh13Detail = "No share feed item ID (SH-05 may have failed)";
    }

    check(
      "SH-13: Blocked user (USER_C) cannot view USER_A's shared workout",
      "R017",
      sh13Passed,
      sh13Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-14: testGetSharedWorkout with nonexistent feedItemId → null
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-14: testGetSharedWorkout with nonexistent ID → null ─\n",
    );

    let sh14Passed = false;
    let sh14Detail = "";
    try {
      // Use a valid-format but nonexistent feedItem ID.
      // We need a real Id format for Convex — use a feedItemId we know exists
      // but delete it first, or construct a query that will return null.
      // The safest approach: use the privateFeedItemId (which has isPublic: false)
      // — it's a different test from SH-07 because we want to test a truly nonexistent ID.
      // However, Convex requires valid Id format. Let's create and delete one.
      const tempFeedId = await client.mutation(api.testing.testCreateFeedItem, {
        testUserId: USER_A,
        workoutId: publicWorkoutId as any,
        summary: {
          name: "Temp",
          durationSeconds: 0,
          exerciseCount: 0,
          prCount: 0,
        },
      });

      // Delete the workout's feed item won't work directly, so instead
      // we use testDeleteWorkout on a temp workout to cascade-delete.
      // Actually, simpler: just query with a nonexistent but valid ID format.
      // Convex will reject invalid IDs at the type level. Instead, let's
      // test with the temp feed item after deleting it.
      // But we can't delete individual feed items easily.
      // Alternative: use the privateFeedItemId which exists but has isPublic=false
      // That's already covered by SH-07.
      //
      // Best approach: Create a temp workout, create a feed item, delete the workout
      // (which cascade-deletes the feed item), then query the deleted feedItemId.
      const tempWorkoutId = await client.mutation(
        api.testing.testCreateWorkout,
        {
          testUserId: USER_A,
          name: "Temp For Delete",
        },
      );
      const tempWe = await client.mutation(api.testing.testAddExercise, {
        testUserId: USER_A,
        workoutId: tempWorkoutId,
        exerciseId: exercise1._id,
      });
      await client.mutation(api.testing.testLogSet, {
        testUserId: USER_A,
        workoutExerciseId: tempWe,
        weight: 10,
        reps: 1,
      });
      await sleep(300);
      await client.mutation(api.testing.testFinishWorkout, {
        testUserId: USER_A,
        id: tempWorkoutId,
      });
      // Get the feed item for this workout
      const tempFeed = await client.query(api.testing.testGetFeed, {
        testUserId: USER_B,
        paginationOpts: { numItems: 50, cursor: null },
      });
      const tempFeedItem = tempFeed.page.find(
        (item: any) =>
          item.authorId === USER_A &&
          item.summary?.name === "Temp For Delete",
      );

      if (tempFeedItem) {
        const deletedFeedItemId = tempFeedItem._id;
        // Delete the workout (cascade-deletes the feed item)
        await client.mutation(api.testing.testDeleteWorkout, {
          testUserId: USER_A,
          id: tempWorkoutId,
        });

        // Now query the deleted feedItemId
        const result = await client.query(api.testing.testGetSharedWorkout, {
          feedItemId: deletedFeedItemId as any,
        });

        sh14Passed = result === null;
        sh14Detail = `Expected null for deleted feedItemId, got: ${result === null ? "null" : "non-null"}`;
      } else {
        // Feed item wasn't found in B's feed — try querying with the temp feedId we created earlier
        // and deleted. Fall back to a simpler approach.
        sh14Detail = "Could not locate temp feed item for deletion test";
      }
    } catch (err: any) {
      // If Convex throws due to invalid ID, that's also acceptable — the point is
      // it doesn't return workout data
      if (
        err.message.includes("not found") ||
        err.message.includes("Invalid")
      ) {
        sh14Passed = true;
        sh14Detail = `Graceful rejection: ${err.message}`;
      } else {
        sh14Detail = `Unexpected error: ${err.message}`;
      }
    }

    check(
      "SH-14: testGetSharedWorkout with nonexistent feedItemId returns null",
      "R017",
      sh14Passed,
      sh14Detail,
    );

    // ══════════════════════════════════════════════════════════════════════
    // SH-15: Clone preserves exercise order
    // ══════════════════════════════════════════════════════════════════════
    console.log(
      "\n── SH-15: Clone preserves exercise order ────────────────\n",
    );

    let sh15Passed = false;
    let sh15Detail = "";
    if (clonedTemplateId) {
      try {
        const template = await client.query(
          api.testing.testGetTemplateWithExercises,
          {
            testUserId: USER_B,
            templateId: clonedTemplateId as any,
          },
        );

        // Source workout had exercise1 (order 0) then exercise2 (order 1)
        const orders = template.exercises.map(
          (e: any) => e.templateExercise.order,
        );
        const exerciseIds = template.exercises.map(
          (e: any) => e.exercise?._id,
        );

        // Verify order is [0, 1] and exercise IDs match source order
        const orderCorrect =
          orders.length === 2 && orders[0] === 0 && orders[1] === 1;
        const idsMatchSource =
          exerciseIds[0] === exercise1._id &&
          exerciseIds[1] === exercise2._id;

        // Also verify second exercise's targetSets/targetReps
        const secondExercise = template.exercises[1];
        const secondTargetSets = secondExercise?.templateExercise?.targetSets;
        const secondTargetReps = secondExercise?.templateExercise?.targetReps;

        sh15Passed =
          orderCorrect &&
          idsMatchSource &&
          secondTargetSets === 2 && // exercise2 had 2 sets
          secondTargetReps === 12; // exercise2 first set reps = 12

        sh15Detail = `orders=${JSON.stringify(orders)}, idsMatch=${idsMatchSource}, exercise2: targetSets=${secondTargetSets}(expected 2), targetReps=${secondTargetReps}(expected 12)`;
      } catch (err: any) {
        sh15Detail = `Template query threw: ${err.message}`;
      }
    } else {
      sh15Detail = "No cloned template ID (SH-08 may have failed)";
    }

    check(
      "SH-15: Clone preserves exercise order and derives correct targetSets/targetReps",
      "R017",
      sh15Passed,
      sh15Detail,
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
