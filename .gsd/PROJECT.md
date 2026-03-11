# Project

## What This Is

A full-stack cross-platform workout tracking application built on a Turborepo monorepo with Next.js (web), Expo (mobile), and Convex (realtime backend). Users log workouts with detailed set tracking (weight, reps, RPE, tempo, rest timers), browse a curated exercise library, save workout templates, view rich analytics and progress charts, follow friends, compete on leaderboards, and participate in collaborative live workout sessions — all synced in realtime across devices.

## Core Value

A user can open the app on their phone at the gym, log a workout set-by-set with full detail, and see that data instantly reflected on any other device — with their history, PRs, and progress always up to date.

## Current State

S01 complete — the full workout-domain Convex schema (8 tables, 14 indexes, 1 search index) is deployed. 144 curated exercises are seeded and browsable at `/exercises` on the web app with muscle group, equipment, and name search filters. Clerk auth gates the exercise page (unauthenticated users are redirected to sign-in). The original notes feature is preserved alongside the new workout tables. Next: S02 — Workout CRUD & Active Workout Session.

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

- [ ] M001: Core Workout Logging — Exercise library, workout CRUD, full set tracking, rest timer, templates, cross-platform UI
- [ ] M002: Analytics & Progress — PR tracking, progress charts, volume analytics, muscle heatmaps, summaries
- [ ] M003: Social Foundation — User profiles, follow system, activity feed, workout sharing
- [ ] M004: Leaderboards & Challenges — Leaderboards, group challenges, achievements, badges
- [ ] M005: Collaborative Workouts — Live shared sessions, partner tracking, realtime presence
