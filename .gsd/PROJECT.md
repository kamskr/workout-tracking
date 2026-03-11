# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, compete on leaderboards, and participate in collaborative live workout sessions — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, and progress always up to date.

## Current State

M001 complete, M002/S01 complete (2026-03-11). 14 of 28 requirements validated. Core workout logging fully functional on web and mobile. M002/S01 added personal records tracking: weight PR (Epley 1RM), volume PR (session total), and rep PR (single-set max) detected inside `logSet` mutation, stored in `personalRecords` table, and surfaced as reactive 🏆 badges during live web workouts. 12/12 PR verification checks pass, 53/53 total backend checks pass (zero regressions). 9-table normalized schema. TypeScript compiles 0 errors across all 3 packages. Next: S02 (progress charts per exercise).

## Architecture / Key Patterns

- **Monorepo:** Turborepo with pnpm workspaces
- **Web:** `apps/web` — Next.js 16 + Tailwind 4 + Radix UI
- **Mobile:** `apps/native` — Expo 54 + React Navigation
- **Backend:** `packages/backend` — Convex (realtime DB, serverless functions)
- **Auth:** Clerk on both platforms, integrated with Convex via `ConvexProviderWithClerk`
- **Styling:** Tailwind CSS (web), React Native StyleSheet (mobile)
- **Design:** Clean/minimal aesthetic — light theme, Apple Health-inspired

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [ ] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries
- [ ] M003: Social Foundation — User profiles, follow system, activity feed, workout sharing
- [ ] M004: Leaderboards & Challenges — Leaderboards, group challenges, achievements, badges
- [ ] M005: Collaborative Workouts — Live shared sessions, partner tracking, realtime presence
