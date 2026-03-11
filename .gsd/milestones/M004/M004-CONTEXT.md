# M004: Leaderboards & Challenges — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M003 completion

## Project Description

Add competitive features: leaderboards for various fitness metrics (strongest lifts, most volume, longest streaks), time-limited group challenges with live standings, and a gamification layer with achievements and badges displayed on user profiles.

## Why This Milestone

Social features (M003) create connections. Competition creates engagement loops. Leaderboards give users a reason to push harder. Challenges create time-bounded urgency. Achievements reward consistency. Together, they turn a logging tool into a game users want to win.

## User-Visible Outcome

### When this milestone is complete, the user can:

- View leaderboards ranked by strongest lifts, most volume, or longest streak — filtered by exercise, time period, and bodyweight class
- Create a challenge (e.g., "most pull-ups this week") and invite friends to join
- See live challenge standings update as participants log workouts
- Earn badges for milestones (first workout, 100 workouts, 1000lb total, etc.) and display them on their profile

### Entry point / environment

- Entry point: Leaderboards tab, Challenges page, Profile badges section (both platforms)
- Environment: local dev and production
- Live dependencies involved: Convex (realtime DB, scheduled functions for challenge lifecycle)

## Completion Class

- Contract complete means: Leaderboard rankings computed correctly, challenge lifecycle (create → join → active → complete) works, badge rules trigger accurately
- Integration complete means: Workout logging automatically updates leaderboard positions and challenge standings in realtime. Badge awards appear on profile.
- Operational complete means: Leaderboards remain accurate and performant with 100+ participants

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Leaderboard shows correct rankings for bench press 1RM across 5+ users
- A user creates a challenge, 3 users join, they log workouts, and the standings update correctly in realtime
- A challenge ends at its deadline and the winner is correctly determined
- A user earns a badge (e.g., "10 workouts completed") and it appears on their profile immediately

## Risks and Unknowns

- **Leaderboard computation at scale** — Ranking queries across all users for specific exercises could be expensive in Convex. May need pre-computed ranking tables updated via scheduled functions.
- **Challenge fairness** — Bodyweight normalization for strength challenges (Wilks/DOTS score) adds complexity.
- **Badge rule engine** — Need a flexible way to define badge triggers without hardcoding each one. Could be a rules table or a set of Convex internal functions.
- **Opt-in vs. opt-out** — Leaderboard participation must be opt-in to respect users who don't want public ranking.

## Existing Codebase / Prior Art

- M001 workout/set data — all competitive metrics derive from logged data
- M002 analytics/PR data — leaderboard rankings share computation patterns with PR detection
- M003 social/profiles — leaderboards and badges display on profiles, challenges require the follow/friend graph

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R018 — Leaderboards
- R019 — Group challenges
- R020 — Achievements and badges

## Scope

### In Scope

- Global and filtered leaderboards (by exercise, time period, bodyweight class)
- Opt-in leaderboard participation
- Challenge creation, joining, live standings, completion
- Challenge types: total reps, total volume, workout count, specific exercise max
- Achievement/badge system with server-side rule evaluation
- Badge display on user profiles
- Cross-platform UI for all competitive features

### Out of Scope / Non-Goals

- Betting or real-money stakes
- Team-based challenges (individual only for now)
- AI-generated challenges
- Collaborative live workouts (M005)

## Technical Constraints

- Rankings must be computed server-side (Convex mutations) to prevent cheating
- Convex scheduled functions for challenge lifecycle (start, end, winner determination)
- Badge evaluation runs on set/workout completion — must not slow down the logging path

## Integration Points

- **M001 workout data** — All metrics computed from workout/set records
- **M002 PR data** — Leaderboards may reuse PR computation logic
- **M003 profiles** — Badges and rankings displayed on profiles
- **M003 social** — Challenge invitations may use the follow graph
- **Convex cron jobs** — For challenge deadline enforcement and periodic leaderboard recalculation

## Open Questions

- **Ranking algorithm** — How to normalize across bodyweight classes? Wilks, DOTS, or simple weight classes?
- **Badge flexibility** — Hardcoded badge definitions or a data-driven rules engine?
- **Challenge privacy** — Public challenges (anyone can join) vs. private (invite-only)?
