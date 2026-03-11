# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, react to workouts, share and clone workout templates — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, progress, and social feed always up to date.

## Current State

M001 complete, M002 complete, M003 complete, M004/S01+S02+S03 complete (2026-03-11). Leaderboards, Group Challenges, and Achievements & Badges backend + web UI shipped. 21-table normalized Convex schema (added userBadges). Gamification layer: 15 badge definitions across 5 categories, threshold-based evaluation engine triggered non-fatally in finishWorkout, getUserBadges query with display metadata enrichment, BadgeDisplay component on profile page. TypeScript compiles 0 new errors across all 3 packages. 82 pending verification checks (42 M003 + 12 M004/S01 + 16 M004/S02 + 12 M004/S03) — **execution pending Convex CLI auth** (`npx convex login`). 72/72 M001+M002 regression baseline. 16 requirements validated, R015-R020 fully implemented but remain active pending live verification. Next: S04 Mobile Competitive Port.

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
