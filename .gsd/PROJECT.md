# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, react to workouts, share and clone workout templates — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, progress, and social feed always up to date.

## Current State

M001 complete, M002 complete, M003 complete (2026-03-11). All 4 M003 slices delivered: user profiles with username uniqueness, follow/unfollow with activity feed, 5-emoji reactions, workout sharing via public links, clone-as-template, privacy controls with defense-in-depth, block/report system, and full mobile port with 6-tab navigation. 15-table normalized Convex schema. TypeScript compiles 0 new errors across all 3 packages. 42 M003 verification checks written (12 profile + 15 social + 15 sharing/privacy) — **execution pending Convex CLI auth** (`npx convex login`). 72/72 M001+M002 regression baseline (not re-run, no breaking changes). 16 requirements validated, R015+R016+R017 fully implemented but remain active pending live verification. Next: Convex CLI auth → run 42+72 verification checks → mobile UAT → M004 planning.

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
- **Styling:** Tailwind CSS (web), React Native StyleSheet (mobile)
- **Design:** Clean/minimal aesthetic — light theme, Apple Health-inspired

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [x] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries
- [x] M003: Social Foundation — User profiles, follow system, activity feed with reactions, workout sharing with privacy controls, mobile social port (verification: partial — 42 checks pending Convex CLI auth)
- [ ] M004: Leaderboards & Challenges — Leaderboards, group challenges, achievements, badges
- [ ] M005: Collaborative Workouts — Live shared sessions, partner tracking, realtime presence
