# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, compete on leaderboards, and participate in collaborative live workout sessions — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, and progress always up to date.

## Current State

M001 complete, M002 complete, M003/S01 complete (2026-03-11). S01 (User Profiles) shipped — profiles table, 7 CRUD/stats/search Convex functions, 12-check verification script, web UI for profile creation and viewing. 16 of 28 requirements validated, R015 advanced (pending live verification). 10-table normalized schema (profiles added). 72/72 existing backend checks (regression baseline). TypeScript compiles 0 errors for backend. Next: Resolve Convex CLI auth, run verify-s01-m03.ts (12 checks), then M003/S02 (Follow System & Activity Feed).

## Architecture / Key Patterns

- **Monorepo:** Turborepo with pnpm workspaces
- **Web:** `apps/web` — Next.js 16 + Tailwind 4 + Radix UI
- **Mobile:** `apps/native` — Expo 54 + React Navigation + Victory Native XL + react-native-svg
- **Backend:** `packages/backend` — Convex (realtime DB, serverless functions)
- **Auth:** Clerk on both platforms, integrated with Convex via `ConvexProviderWithClerk`
- **Charts:** Recharts (web) + Victory Native XL with @shopify/react-native-skia (mobile) — shared data shape contract (D046)
- **Styling:** Tailwind CSS (web), React Native StyleSheet (mobile)
- **Design:** Clean/minimal aesthetic — light theme, Apple Health-inspired

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [x] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries (human UAT pending)
- [ ] M003: Social Foundation — User profiles, follow system, activity feed, workout sharing
- [ ] M004: Leaderboards & Challenges — Leaderboards, group challenges, achievements, badges
- [ ] M005: Collaborative Workouts — Live shared sessions, partner tracking, realtime presence
