#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "../../..");
const backendEnvPath = path.join(workspaceRoot, "packages/backend/.env.local");
const webEnvPath = path.join(workspaceRoot, "apps/web/.env.local");
const nativeEnvPath = path.join(workspaceRoot, "apps/native/.env");

const optionalByFile: Record<string, string[]> = {
  [backendEnvPath]: ["OPENAI_API_KEY"],
  [webEnvPath]: ["CLERK_SECRET_KEY"],
};

const requiredFiles = [
  {
    label: "backend",
    path: backendEnvPath,
    requiredVars: ["CONVEX_URL", "CLERK_ISSUER_URL"],
  },
  {
    label: "web",
    path: webEnvPath,
    requiredVars: ["NEXT_PUBLIC_CONVEX_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  },
  {
    label: "native",
    path: nativeEnvPath,
    requiredVars: ["EXPO_PUBLIC_CONVEX_URL", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  },
] as const;

type EnvMap = Record<string, string>;

type ValidationResult = {
  ok: boolean;
  diagnostics: string[];
};

function parseEnvFile(filePath: string): EnvMap {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const values: EnvMap = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function validateContract(paths = requiredFiles): ValidationResult {
  const diagnostics: string[] = [];
  const envByLabel = new Map<string, EnvMap>();

  for (const file of paths) {
    if (!fs.existsSync(file.path)) {
      diagnostics.push(
        `[missing-file] package=${file.label} file=${file.path}`,
      );
      continue;
    }

    const env = parseEnvFile(file.path);
    envByLabel.set(file.label, env);

    const missingVars = file.requiredVars.filter((key) => !env[key]);
    if (missingVars.length > 0) {
      diagnostics.push(
        `[missing-vars] package=${file.label} file=${file.path} vars=${missingVars.join(",")}`,
      );
    }

    const optionalVars = (optionalByFile[file.path] ?? []).filter((key) => !env[key]);
    if (optionalVars.length > 0) {
      diagnostics.push(
        `[optional-missing] package=${file.label} file=${file.path} vars=${optionalVars.join(",")}`,
      );
    }
  }

  const backendEnv = envByLabel.get("backend");
  const webEnv = envByLabel.get("web");
  const nativeEnv = envByLabel.get("native");

  if (backendEnv?.CONVEX_URL && webEnv?.NEXT_PUBLIC_CONVEX_URL) {
    if (normalizeUrl(backendEnv.CONVEX_URL) !== normalizeUrl(webEnv.NEXT_PUBLIC_CONVEX_URL)) {
      diagnostics.push(
        `[mismatch] packages=backend,web vars=CONVEX_URL,NEXT_PUBLIC_CONVEX_URL`,
      );
    }
  }

  if (backendEnv?.CONVEX_URL && nativeEnv?.EXPO_PUBLIC_CONVEX_URL) {
    if (normalizeUrl(backendEnv.CONVEX_URL) !== normalizeUrl(nativeEnv.EXPO_PUBLIC_CONVEX_URL)) {
      diagnostics.push(
        `[mismatch] packages=backend,native vars=CONVEX_URL,EXPO_PUBLIC_CONVEX_URL`,
      );
    }
  }

  if (
    webEnv?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    nativeEnv?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    webEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== nativeEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    diagnostics.push(
      `[mismatch] packages=web,native vars=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
    );
  }

  return { ok: diagnostics.filter((line) => !line.startsWith("[optional-missing]")).length === 0, diagnostics };
}

function runFailureFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "env-contract-fixture-"));
  const fixtureFiles = {
    backend: path.join(tempRoot, "packages/backend/.env.local"),
    web: path.join(tempRoot, "apps/web/.env.local"),
    native: path.join(tempRoot, "apps/native/.env"),
  };

  fs.mkdirSync(path.dirname(fixtureFiles.backend), { recursive: true });
  fs.mkdirSync(path.dirname(fixtureFiles.web), { recursive: true });
  fs.mkdirSync(path.dirname(fixtureFiles.native), { recursive: true });

  fs.writeFileSync(
    fixtureFiles.backend,
    [
      "CONVEX_URL=https://demo.convex.cloud",
      "CLERK_ISSUER_URL=https://issuer.example.com",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    fixtureFiles.web,
    [
      "NEXT_PUBLIC_CONVEX_URL=https://different.convex.cloud/",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_web",
      "",
    ].join("\n"),
  );

  const result = validateContract([
    {
      label: "backend",
      path: fixtureFiles.backend,
      requiredVars: ["CONVEX_URL", "CLERK_ISSUER_URL"],
    },
    {
      label: "web",
      path: fixtureFiles.web,
      requiredVars: ["NEXT_PUBLIC_CONVEX_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    },
    {
      label: "native",
      path: fixtureFiles.native,
      requiredVars: ["EXPO_PUBLIC_CONVEX_URL", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    },
  ]);

  const sawMissingFile = result.diagnostics.some((line) => line.includes("package=native"));
  const sawMismatch = result.diagnostics.some((line) =>
    line.includes("packages=backend,web vars=CONVEX_URL,NEXT_PUBLIC_CONVEX_URL"),
  );

  if (!sawMissingFile || !sawMismatch) {
    console.error("Failure fixture did not produce the expected diagnostics.");
    for (const diagnostic of result.diagnostics) {
      console.error(diagnostic);
    }
    process.exit(1);
  }

  console.log("Failure fixture produced inspectable diagnostics:");
  for (const diagnostic of result.diagnostics) {
    console.log(diagnostic);
  }
}

if (process.argv.includes("--check-failure-fixture")) {
  runFailureFixture();
  process.exit(0);
}

const result = validateContract();

if (result.diagnostics.length === 0) {
  console.log("Env contract OK across backend, web, and native.");
  process.exit(0);
}

for (const diagnostic of result.diagnostics) {
  const out = diagnostic.startsWith("[optional-missing]") ? console.warn : console.error;
  out(diagnostic);
}

if (!result.ok) {
  process.exit(1);
}
