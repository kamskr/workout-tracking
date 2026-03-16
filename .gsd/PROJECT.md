# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, react to workouts, share and clone workout templates, compete on leaderboards and in challenges, earn achievement badges, and train together in collaborative live workout sessions — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, progress, social feed, and group sessions always up to date.

## Current State

M001–M005 remain shipped. M006 is now closed as a truthful stabilization milestone: the backend verification gap is retired and the web product has been substantially refreshed, but final runtime proof is still blocked at two boundaries.

- **M006 complete as recorded work:**
  - S01 established the canonical local env/runtime contract, verified seeded backend readiness, fixed native Convex dependency resolution, and proved local web boot.
  - S02 replaced the leftover UseNotes landing source with workout-specific marketing content and premium landing styling.
  - S03 established a dedicated authenticated App Router shell seam, shared Apple Fitness+-style web primitives, and blocker-aware shell verification.
  - S04 widened that design system across the remaining authenticated web routes and feature surfaces, including session collaboration pages.
  - S05 executed the full live backend verification sweep for M003–M005 and closed it green: M003 `42/42`, M004 `40/40`, M005 `41/41`.
  - S06 proved the current native boundary honestly: native typecheck passes and Expo reaches Metro, but simulator launch is still blocked by this machine’s Xcode/`simctl` setup.

- **What is now proven:**
  - Backend env alignment/readiness is diagnosable via `packages/backend/scripts/verify-env-contract.ts` and `packages/backend/scripts/verify-seed-data.ts`.
  - The live Convex backend has seeded data and passes all pending M003–M005 verification runners.
  - TypeScript compiles across backend, web, and native with no new milestone-introduced errors.
  - The public landing source and authenticated web source now reflect the intended product and design language.

- **What remains blocked / unproven:**
  - Live browser proof for the redesigned landing page and authenticated app pages is still blocked in this worktree by pre-render auth/runtime failure (`Publishable key not valid.` / blocker-classified page failure on the worktree-local server).
  - Native iOS simulator proof is still blocked because `xcode-select -p` points at `/Library/Developer/CommandLineTools` and `xcrun simctl list devices` fails.
  - Because of those two runtime blockers, M006 did not satisfy the original milestone definition of done in full, even though all slices are closed and the backend verification target is complete.

**Backend:** Convex backend is reachable from the current local env contract, seeded with 144 exercises, and verified live for all pending M003–M005 checks.

**Compilation:** The workspace typecheck path passes across backend, web, and native. Native direct `convex` dependency resolution remains the fix for prior pnpm-strict module failures.

**Web:** The landing page and authenticated page refresh are implemented in source, with shared app-shell seams and blocker-aware Playwright coverage. The truthful remaining gap is runtime render proof under valid Clerk/local auth configuration.

**Mobile:** Native code compiles and Expo can start Metro, but the simulator/tooling boundary is still external to app code on this machine.

## Architecture / Key Patterns

- **Monorepo:** Turborepo with pnpm workspaces
- **Web:** `apps/web` — Next.js 16 + Tailwind 4 + Radix UI
- **Mobile:** `apps/native` — Expo 54 + React Navigation + Victory Native XL + react-native-svg
- **Backend:** `packages/backend` — Convex (realtime DB, serverless functions)
- **Auth:** Clerk on both platforms, integrated with Convex via `ConvexProviderWithClerk`
- **Charts:** Recharts (web) + Victory Native XL with @shopify/react-native-skia (mobile) — shared data shape contract (D046)
- **Social:** Hybrid feed denormalization (D070) — feedItems table with denormalized snapshots, single-table paginate + post-filter (D087)
- **Privacy:** Defense-in-depth (D098) — isPublic checked on both feedItems and workouts, cascade updates on toggle
- **Sharing:** Public Convex queries (no auth required) + Clerk middleware exclusion for /shared routes (D075)
- **Leaderboards:** Pre-computed entries via non-fatal finishWorkout hook (D107/D108), opt-in filtering at query time (D109/D120), bounded rank scan (D114)
- **Challenges:** Lifecycle state machine (D111), incremental delta computation (D121), cron-based deadline enforcement + scheduler.runAt precision (D126), creator auto-join (D125)
- **Badges:** Hardcoded definitions constant (D110/D128), batch-fetch evaluation engine (D129), 4th non-fatal finishWorkout hook, BadgeDisplay on profile page (D130/D131)
- **Sessions:** Separate sessionParticipants table (D137), heartbeat-based presence with cron cleanup (D139), server-authoritative timer via stored timerEndAt (D138), finishWorkoutCore for unified hook execution (D159)
- **Styling:** Tailwind CSS (web), React Native StyleSheet (mobile)
- **Design:** Web now uses the M006 Apple Fitness+-style shell/tokens and premium landing surfaces; mobile remains on the pre-existing native design language.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [x] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries
- [x] M003: Social Foundation — User profiles, follow system, activity feed with reactions, workout sharing with privacy controls, mobile social port
- [x] M004: Leaderboards & Challenges — Pre-computed leaderboards with opt-in privacy, 4-type group challenges with cron lifecycle, 15-badge gamification, mobile competitive port
- [x] M005: Collaborative Live Workouts — Session creation with invite links, realtime presence, shared timer, host-controlled lifecycle, finishWorkoutCore integration, mobile port
- [x] M006: Stabilization, Testing & Design Refresh — env/runtime contract, landing/app-shell refresh, live M003–M005 backend verification, and truthful native/runtime blocker localization
