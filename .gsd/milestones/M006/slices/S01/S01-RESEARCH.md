# M006/S01 — Infrastructure & Dev Stack — Research

**Date:** 2026-03-13

## Summary

This slice owns **R029 — Dev Stack Boots Cleanly** and is the prerequisite for S02–S06. In practice, S01 must establish a working local runtime contract across three packages: **Convex backend**, **Next.js web**, and **Expo native**. The backend is the keystone: the web and native apps both instantiate `ConvexReactClient` from env vars, Clerk auth is wired on both platforms, and all live verification scripts use `ConvexHttpClient` pointed at `CONVEX_URL`. If Convex is not running against a real deployment with the right auth env vars, nothing downstream is trustworthy.

The biggest surprise is that the repo is **not blocked only by Convex CLI auth**. There is also a concrete, immediate compile/runtime risk in the mobile package: `apps/native/package.json` does **not** declare a direct `convex` dependency, and `pnpm turbo run typecheck` currently fails with dozens of `Cannot find module 'convex/react'` errors in native. So even if Convex auth is solved, S01 still cannot claim “dev stack boots cleanly” until native dependency wiring is corrected. A second surprise: the repo root and web app already contain local env files pointing at `http://127.0.0.1:3210`, which implies an old/local Convex dev setup assumption is still baked into the project, but `packages/backend/.env.local` is missing entirely — exactly where all verification scripts expect `CONVEX_URL` by default.

## Recommendation

Take a **backend-first, env-contract-first** approach:

1. **Establish the canonical Convex connection source** in `packages/backend/.env.local` with a real `CONVEX_URL` from the user’s deployment or a successfully authenticated `convex dev` session.
2. **Configure Convex auth env vars** for Clerk, especially `CLERK_ISSUER_URL` / Clerk issuer domain on the Convex side, because `packages/backend/convex/auth.config.js` depends on it.
3. **Align app env files** so web uses `NEXT_PUBLIC_CONVEX_URL` and native uses `EXPO_PUBLIC_CONVEX_URL` from the same backend URL.
4. **Fix native package dependency resolution** before claiming clean boot: add/verify direct `convex` dependency in `apps/native` so TypeScript and Expo can resolve `convex/react` and `convex/react-clerk`.
5. **Seed data explicitly** against the live backend before verification/UI checks. Many scripts assume exercise seed data already exists.
6. Only after that, boot services in this order: **Convex → web → native**.

This approach matches the actual runtime coupling in the codebase and minimizes false progress.

## Active Requirements This Slice Owns / Supports

### Owns
- **R029 — Dev Stack Boots Cleanly**
  - Convex backend boots with a live deployment
  - Next.js app boots at localhost:3000
  - Expo app boots cleanly
  - Seed data available
  - Dependencies resolved

### Supports indirectly
- **R030–R033** all depend on S01’s output
- **R015–R021** cannot be live-validated until S01 provides a working Convex deployment + env wiring

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Backend verification without Clerk tokens | `packages/backend/convex/testing.ts` + `ConvexHttpClient` verify scripts | This is the established project pattern since M001. Don’t invent ad hoc seed/test scripts. |
| Exercise seed population | `packages/backend/convex/seed.ts` | Idempotent by slug via `by_slug` index; safe to rerun. |
| Web auth protection | `apps/web/src/middleware.ts` | Already defines protected vs public routes, including the intentional `/shared` exception. |
| Shared workout completion hooks | `packages/backend/convex/lib/finishWorkoutCore.ts` and test helpers that call it | Downstream verification assumes this shared path; avoid bypassing production behavior. |
| Convex + Clerk provider integration | Existing `ConvexClientProvider` components in web/native | The structure already exists; the issue is env/dependency correctness, not missing architecture. |

## Existing Code and Patterns

- `apps/web/src/app/ConvexClientProvider.tsx` — Web app creates `ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)` and wraps app with Clerk + Convex provider. This hard-requires the public Convex URL at runtime.
- `apps/native/ConvexClientProvider.tsx` — Native app does the same with `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `apps/web/src/middleware.ts` — Clerk middleware protects all authenticated app areas: `/exercises`, `/workouts`, `/templates`, `/analytics`, `/profile`, `/feed`, `/leaderboards`, `/challenges`, `/session`. `/shared` is intentionally public.
- `packages/backend/convex/auth.config.js` — Convex expects Clerk issuer config from `process.env.CLERK_ISSUER_URL` with `applicationID: "convex"`.
- `packages/backend/convex/seed.ts` — Idempotent `internalMutation` inserts exercise seed data and logs inserted/skipped counts.
- `packages/backend/convex/testing.ts` — Massive testing surface already exists; verification scripts rely on this instead of auth tokens.
- `packages/backend/scripts/verify-*.ts` — All scripts resolve `CONVEX_URL` from env or `packages/backend/.env.local`, then call live backend APIs with `ConvexHttpClient`.
- `apps/native/src/navigation/MainTabs.tsx` — Native runtime target is a 7-tab app, matching M006 success criteria for S06 but also proving the app surface area S01 must boot.

## Key Findings

### 1) The real S01 requirement is an env contract across three packages
The stack is split across:
- root workspace orchestration (`turbo`, `pnpm`)
- backend package (`convex dev` / verify scripts)
- web (`NEXT_PUBLIC_*` + Clerk secret)
- native (`EXPO_PUBLIC_*`)

There is no single shared env loader. Each layer expects its own values. That makes env drift a primary operational risk.

### 2) Verification scripts are standardized around `packages/backend/.env.local`
Every verification script checks:
1. `process.env.CONVEX_URL`
2. fallback: `packages/backend/.env.local`

But currently, research found:
- root `.env.local` exists and contains `CONVEX_URL=http://127.0.0.1:3210/`
- `apps/web/.env.local` exists and contains matching local URLs + Clerk keys
- `apps/native/.env` exists
- **`packages/backend/.env.local` does not exist**

That means the verification path expected by the codebase is missing at the backend package boundary.

### 3) Native currently fails typecheck because `convex` is not a direct dependency
Observed from `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`:
- `@packages/backend`: passes
- `web-app`: passes
- `native-app`: fails with many `TS2307` errors for `convex/react` and `convex/react-clerk`

`apps/native/package.json` does **not** list `convex`, while `apps/web/package.json` does. Under pnpm strictness, native cannot rely on hoisted transitive access. This is a slice-blocking issue for R029.

### 4) The repo still carries template-era assumptions
Root `README.md` is still the generic notes app template. It instructs users to:
- run `pnpm --filter @packages/backend setup`
- set Clerk + Convex env vars
- create `.env.local` in each app from example files

That guidance is directionally useful, but it is stale relative to current M006 goals and does not reflect the known Convex CLI auth failure in non-interactive environments.

### 5) Seed data is assumed, not auto-guaranteed
Many M003–M005 verification scripts fetch an exercise via `api.exercises.listExercises({})` and proceed only if at least one exists. They do not seed automatically. S01 must ensure exercise seeding happened before any serious verification or UI checks.

### 6) Convex auth is configured, but only if the backend deployment has the right env vars
The code expects Clerk-issued JWTs on Convex using `applicationID: "convex"`. If the Convex deployment is missing the corresponding issuer env var, auth-gated queries/mutations will fail even if the app boots. So “backend connected” is not enough; **backend auth must match Clerk configuration**.

### 7) The M006 roadmap’s “119 pending checks” does not match raw script `check()` count in repo
A quick code count across the M003–M005 verify scripts found **132 `check(...)` calls**, not 119. This may be due to:
- roadmap count lagging code changes
- helper/meta checks added later
- acceptance docs not updated

This discrepancy matters for planning and final proof language.

## Constraints

- **Convex is cloud-first even in dev.** Official docs still center `npx convex dev`, login, project setup, and synced deployments — not an offline local DB.
- **All live verify scripts require `CONVEX_URL`.** No URL, no proof.
- **Convex auth depends on Clerk issuer env var on the deployment.** `packages/backend/convex/auth.config.js` will not work without it.
- **Web and native apps both instantiate Convex clients from env at startup.** Missing env is a hard failure, not a soft degradation.
- **Native package currently does not compile cleanly.** This violates the milestone-level “TypeScript compiles 0 new errors across all 3 packages” constraint.
- **Expo iOS requires working Xcode simulator tooling.** S06 owns that, but S01 research confirms it as a downstream infra dependency.
- **Next.js routes are auth-gated by middleware.** Testing authenticated pages without valid Clerk configuration will immediately redirect/fail.

## Common Pitfalls

- **Assuming web env implies backend env is configured** — It does not. Scripts read `packages/backend/.env.local` or process env, not root/web env files.
- **Assuming `pnpm install` success means native is ready** — It is not. Native currently type-fails due to unresolved `convex/*` imports.
- **Forgetting seed data before verification** — Many checks implicitly require a populated exercise library.
- **Solving only `CONVEX_URL` but not Clerk issuer config** — Web/native may appear connected but authenticated Convex calls will fail.
- **Treating root `.env.local` as canonical** — The codebase’s own backend scripts do not.
- **Trusting the roadmap count blindly** — the actual verification surface in code appears larger than the milestone text says.

## Open Risks

- **Convex non-interactive login may still block `convex dev`** unless the user provides a deployment URL or there is an already-authenticated local CLI session.
- **`packages/backend/.env.local` may need to be created/populated** before any verify scripts are usable in the standard path.
- **Native compile issue may cascade into Expo runtime failures** even after adding `convex`; there may be more Expo-specific problems once TypeScript gets past module resolution.
- **Clerk publishable/secret keys in local files may be stale** even if present; no runtime verification has yet confirmed they belong to an active Clerk app.
- **M003–M005 verification script count mismatch** could cause milestone proof disputes if not reconciled early.

## Skill Discovery

Installed skills already available in system prompt:
- `debug-like-expert` — relevant if Convex auth / boot remains blocked
- `swiftui` — not directly relevant for this slice
- `frontend-design` — not relevant for S01 research

Promising external skills discovered (do not install automatically):

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` | available |
| Convex | `waynesutton/convexskills@convex-best-practices` | available |
| Next.js | `wshobson/agents@nextjs-app-router-patterns` | available |
| Clerk | `clerk/skills@clerk-nextjs-patterns` | available |
| Clerk | `clerk/skills@clerk` | available |
| Expo | `expo/skills@expo-dev-client` | available |

Recommended if the user wants additional help for execution rather than research:
- `npx skills add waynesutton/convexskills@convex`
- `npx skills add clerk/skills@clerk-nextjs-patterns`
- `npx skills add expo/skills@expo-dev-client`

## Library Notes

### Convex
Official docs confirm:
- `npx convex dev` is the standard dev entrypoint
- Clerk integration expects issuer domain configured in Convex auth config
- React Native uses `ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!)`

### Clerk
Clerk docs confirm the expected pattern is:
- wrap app with `ClerkProvider`
- wrap Convex with `ConvexProviderWithClerk`
- pass `useAuth`
- use publishable key env vars on client apps

The current repo follows the provider pattern, so the issue is not architecture but environment correctness.

### Expo
Expo docs confirm iOS simulator usage is still based on `expo start` then `i`, or `expo start --ios`, with Xcode/simulator availability required. That becomes a real operational dependency for S06, not S01, but it is part of the dev-stack boundary.

## Recommended Execution Checklist for S01

1. Confirm canonical backend target:
   - user-provided live Convex deployment URL, or
   - authenticated `convex dev` deployment URL
2. Create/populate `packages/backend/.env.local` with `CONVEX_URL=...`
3. Confirm/set Convex deployment env vars for Clerk issuer
4. Align `apps/web/.env.local` and `apps/native/.env` to same backend URL
5. Fix `apps/native/package.json` direct dependency on `convex`
6. Re-run typecheck across all three packages
7. Start backend, web, and native dev processes
8. Run seed mutation if exercise library is empty
9. Prove web loads at localhost:3000 with auth functional
10. Capture exact blockers remaining for native boot if any

## Sources

- Repo code and scripts inspected directly:
  - `package.json`
  - `apps/web/package.json`
  - `apps/native/package.json`
  - `packages/backend/package.json`
  - `apps/web/src/app/ConvexClientProvider.tsx`
  - `apps/native/ConvexClientProvider.tsx`
  - `apps/web/src/middleware.ts`
  - `packages/backend/convex/auth.config.js`
  - `packages/backend/convex/seed.ts`
  - `packages/backend/convex/testing.ts`
  - `packages/backend/scripts/verify-*.ts`
  - `apps/web/.example.env`
  - `apps/native/.example.env`
  - `apps/web/.env.local`
  - `.env.local`
- Context7 docs:
  - Convex docs on `convex dev`, Clerk auth config, React Native client setup
  - Clerk docs on Convex + Clerk provider wiring in Next.js/React
  - Expo docs on iOS simulator startup
  - Next.js docs on environment variable usage in App Router
