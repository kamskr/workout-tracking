#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const workspaceRoot = path.resolve(__dirname, "../../..");
const backendEnvPath = path.join(workspaceRoot, "packages/backend/.env.local");

type FailurePhase = "env" | "connectivity" | "auth-or-deployment" | "seed-data";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const entries: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals === -1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

function resolveConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  const env = parseEnvFile(backendEnvPath);
  if (env.CONVEX_URL) return env.CONVEX_URL;

  fail(
    "env",
    `Missing canonical backend env. Create ${backendEnvPath} with CONVEX_URL.`,
  );
}

function fail(phase: FailurePhase, message: string): never {
  console.error(`[${phase}] ${message}`);
  process.exit(1);
}

async function main() {
  const convexUrl = resolveConvexUrl();
  console.log(`Checking seed data against backend URL from ${backendEnvPath}`);

  const client = new ConvexHttpClient(convexUrl);

  let exercises: unknown;
  try {
    exercises = await client.query(api.exercises.listExercises, {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/401|403|unauth|forbidden|token|issuer|deployment|clerk/i.test(message)) {
      fail(
        "auth-or-deployment",
        `Backend responded but rejected the request. Check deployment auth and Clerk issuer alignment for ${convexUrl}.`,
      );
    }

    fail(
      "connectivity",
      `Could not reach ${convexUrl}. ${message}`,
    );
  }

  if (!Array.isArray(exercises)) {
    fail(
      "auth-or-deployment",
      `Unexpected response shape from ${convexUrl}; expected exercise array.`,
    );
  }

  console.log(`Seed query returned ${exercises.length} exercises.`);

  if (exercises.length === 0) {
    fail(
      "seed-data",
      `Deployment is reachable but exercises.listExercises returned zero rows. Seed data is missing.`,
    );
  }

  console.log("Seed data verification passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail("connectivity", message);
});
