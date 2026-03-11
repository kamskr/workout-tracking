#!/usr/bin/env npx tsx
/**
 * S01 End-to-End Verification Script
 *
 * Exercises the Convex exercise query functions programmatically to verify:
 *   R001 — Exercise seed data (>= 100 exercises)
 *   R010 — Muscle group, equipment, search, and combined filters
 *
 * Usage:
 *   npx tsx packages/backend/scripts/verify-s01.ts
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

  // Try .env.local in the backend package
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const url = getConvexUrl();
  console.log(`\nConnecting to Convex at ${url}\n`);
  const client = new ConvexHttpClient(url);

  console.log("── R001: Exercise Seed Data ──────────────────────────────\n");

  // 1. All exercises — at least 100
  const all = await client.query(api.exercises.listExercises, {});
  check(
    "Total exercises >= 100",
    "R001",
    all.length >= 100,
    `Expected >= 100, got ${all.length}`,
  );

  console.log(
    `\n── R010: Filter & Search Queries ─────────────────────────\n`,
  );

  // 2. Muscle group filter — chest
  const chestResults = await client.query(api.exercises.listExercises, {
    primaryMuscleGroup: "chest",
  });
  const allChest = chestResults.every(
    (e: any) => e.primaryMuscleGroup === "chest",
  );
  check(
    "Muscle group filter (chest)",
    "R010",
    chestResults.length > 0 && allChest,
    allChest
      ? `Got ${chestResults.length} results but expected > 0`
      : `Found non-chest result in chest filter: ${chestResults.find((e: any) => e.primaryMuscleGroup !== "chest")?.primaryMuscleGroup}`,
  );

  // 3. Equipment filter — barbell
  const barbellResults = await client.query(api.exercises.listExercises, {
    equipment: "barbell",
  });
  const allBarbell = barbellResults.every(
    (e: any) => e.equipment === "barbell",
  );
  check(
    "Equipment filter (barbell)",
    "R010",
    barbellResults.length > 0 && allBarbell,
    allBarbell
      ? `Got ${barbellResults.length} results but expected > 0`
      : `Found non-barbell result in barbell filter: ${barbellResults.find((e: any) => e.equipment !== "barbell")?.equipment}`,
  );

  // 4. Search query — "press"
  const searchResults = await client.query(api.exercises.listExercises, {
    searchQuery: "press",
  });
  const allContainPress = searchResults.every((e: any) =>
    e.name.toLowerCase().includes("press"),
  );
  check(
    'Search query ("press")',
    "R010",
    searchResults.length > 0 && allContainPress,
    allContainPress
      ? `Got ${searchResults.length} results but expected > 0`
      : `Found result not containing "press": "${searchResults.find((e: any) => !e.name.toLowerCase().includes("press"))?.name}"`,
  );

  // 5. Combined filter — chest + barbell
  const combinedResults = await client.query(api.exercises.listExercises, {
    primaryMuscleGroup: "chest",
    equipment: "barbell",
  });
  const combinedCorrect = combinedResults.every(
    (e: any) =>
      e.primaryMuscleGroup === "chest" && e.equipment === "barbell",
  );
  check(
    "Combined filter (chest + barbell)",
    "R010",
    combinedResults.length > 0 && combinedCorrect,
    combinedCorrect
      ? `Got ${combinedResults.length} results but expected > 0`
      : `Found result not matching combined filter`,
  );

  // 6. Combined filter — search + muscle group
  const searchPlusFilter = await client.query(api.exercises.listExercises, {
    searchQuery: "press",
    primaryMuscleGroup: "chest",
  });
  const searchPlusCorrect = searchPlusFilter.every(
    (e: any) =>
      e.name.toLowerCase().includes("press") &&
      e.primaryMuscleGroup === "chest",
  );
  check(
    'Search + filter ("press" + chest)',
    "R010",
    searchPlusFilter.length > 0 && searchPlusCorrect,
    searchPlusCorrect
      ? `Got ${searchPlusFilter.length} results but expected > 0`
      : `Found result not matching combined search+filter`,
  );

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n── Summary ──────────────────────────────────────────────\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  ${passed} passed, ${failed} failed out of ${results.length} checks\n`);

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
