# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, react to workouts, share and clone workout templates, compete on leaderboards and in challenges, earn achievement badges, and train together in collaborative live workout sessions — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, progress, social feed, and group sessions always up to date.

## Current State

All 5 milestones complete (2026-03-11). 5 milestones, 22 slices, 73 tasks shipped. 23-table normalized Convex schema with 164 decisions recorded (D001–D164). Full feature set across both platforms:

- **Core:** Exercise library (144 exercises), workout CRUD with full set tracking (weight, reps, RPE, tempo, notes), rest timer with 4-level priority chain, workout templates, superset grouping
- **Analytics:** Personal records (weight/volume/rep PRs), progress charts per exercise, volume analytics with muscle group heatmaps, weekly/monthly summaries
- **Social:** User profiles with stats, follow system, realtime activity feed with 5 reaction types, workout sharing with privacy controls, clone-as-template
- **Competitive:** Pre-computed leaderboards with opt-in privacy, 4-type group challenges with cron lifecycle, 15-badge gamification system
- **Collaborative:** Live group workout sessions with invite codes, realtime presence via heartbeat + cron, live set feed, server-authoritative shared timer, host-only session ending, combined summary, abandoned session auto-timeout, full workout→hooks integration via `finishWorkoutCore`

**Backend:** 7 Convex modules (workouts, exercises, sessions, social, sharing, badges, analytics) + `finishWorkoutCore` lib function as single source of truth for workout completion hooks (feed, leaderboard, challenge, badge). `crons.ts` runs 3 entries: 15-min challenge deadline enforcement, 30s session presence cleanup, 5-min session timeout check. `sessions.ts` has 15 functions covering full group session lifecycle.

**Mobile:** 7-tab navigation (Exercises, Workouts, Templates, Analytics, Feed, Profile, Compete) with typed stack navigators covering all domains.

**Compilation:** TypeScript compiles 0 new errors across all 3 packages (backend: 0, web: 0, native: 44 pre-existing TS2307 `convex/react` path resolution errors).

**Verification:** 72/72 M001+M002 backend checks pass (live). 119 additional checks across M003–M005 (42 + 40 + 37) written and compile — **execution pending Convex CLI auth** (`npx convex login`). 16 requirements validated (R001–R014, R022, R023). 7 requirements active (R015–R021) — all fully implemented, pending live verification to move to validated.

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
- **Design:** Clean/minimal aesthetic — light theme, Apple Health-inspired (D007)

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [x] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries
- [x] M003: Social Foundation — User profiles, follow system, activity feed with reactions, workout sharing with privacy controls, mobile social port
- [x] M004: Leaderboards & Challenges — Pre-computed leaderboards with opt-in privacy, 4-type group challenges with cron lifecycle, 15-badge gamification, mobile competitive port
- [x] M005: Collaborative Live Workouts — Session creation with invite links, realtime presence, shared timer, host-controlled lifecycle, finishWorkoutCore integration, mobile port
- [ ] M006: Stabilization, Testing & Design Refresh — Dev stack setup, landing page redesign, app pages Apple Fitness+ refresh, 119 backend verification checks, mobile testing on iOS Simulator
