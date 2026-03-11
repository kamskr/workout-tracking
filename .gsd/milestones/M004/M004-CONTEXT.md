# M004: Leaderboards & Challenges — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M003 completion

## Project Description

Adds competitive and gamification features — leaderboards (by exercise, time period, bodyweight class), time-limited group challenges, and an achievement/badge system. Drives engagement through competition and collection mechanics.

## Why This Milestone

Social features (M003) connect users. Competitive features give them reasons to push harder. Leaderboards and challenges create recurring engagement loops ("Can I beat my ranking this week?"), while badges provide long-term collection motivation.

## User-Visible Outcome

### When this milestone is complete, the user can:

- View leaderboards for any exercise — see top lifts by absolute weight or by bodyweight class
- Filter leaderboards by time period (all-time, this month, this week)
- Create or join time-limited challenges with specific rules (e.g., "most pull-ups in 7 days")
- See live challenge leaderboards that update as participants log workouts
- Earn badges for milestones (first workout, 100 workouts, 1000lb total, streak achievements, etc.)
- View earned badges on their profile

### Entry point / environment

- Entry point: Leaderboard tab, challenge section, badge display on profile
- Environment: local dev, both platforms
- Live dependencies involved: Convex (data, realtime)

## Completion Class

- Contract complete means: Leaderboard rankings compute correctly, challenge rules evaluate accurately against workout data, badge trigger logic fires at the right moments
- Integration complete means: Logging a qualifying set updates leaderboard position in realtime, challenge progress auto-computes from workout data
- Operational complete means: Multiple users competing on a leaderboard or challenge see live position changes

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Two users opt into a leaderboard for bench press. User A logs a heavier set. The leaderboard updates to reflect User A's higher ranking within seconds.
- A challenge "20 workouts in 30 days" is created. Participants' progress auto-increments as they complete workouts. The challenge leaderboard is accurate.
- A user earns the "First Workout" badge on their first completed workout and it appears on their profile.

## Risks and Unknowns

- **Leaderboard computation at scale** — Ranking all users by a metric requires scanning significant data. Convex lacks native aggregation. May need denormalized leaderboard tables updated via triggers.
- **Anti-cheating** — Self-reported workout data means leaderboards can be gamed. Need to decide on trust model (honor system, outlier detection, or manual moderation).
- **Badge trigger complexity** — Some badges require complex historical analysis (e.g., "logged a workout every day for 30 days straight"). Need efficient streak detection.
- **Challenge rule engine** — Challenges have varied rules. Need a flexible but not over-engineered rule definition system.

## Existing Codebase / Prior Art

- M003 delivers: user profiles, follow system — leaderboards and badges display on profiles
- M002 delivers: PR tracking — PR data feeds into leaderboard rankings
- M001 delivers: workout and set data — the raw input for all competitive metrics

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R018 — Leaderboards (primary: S01)
- R019 — Group challenges (primary: S02)
- R020 — Achievements and badges (primary: S03)

## Scope

### In Scope

- Exercise-specific leaderboards (absolute and bodyweight-relative)
- Time-filtered leaderboards (all-time, monthly, weekly)
- Opt-in leaderboard participation
- Challenge creation with start/end dates and rules
- Challenge join/leave
- Live challenge leaderboards
- Achievement/badge definitions (~20 initial badges)
- Badge display on profile
- Both platforms

### Out of Scope / Non-Goals

- Paid/premium challenges
- Team-based competitions (beyond simple group challenges)
- Prize/reward distribution
- Anti-cheat moderation tools (honor system for now)

## Technical Constraints

- Leaderboard rankings should update in near-realtime when qualifying sets are logged
- Badge checks must run server-side to prevent client-side cheating
- Challenge progress must be derived from actual workout data, not self-reported
- Convex scheduled functions or triggers may be needed for periodic leaderboard recomputation

## Integration Points

- **M003 profiles** — Badges display on profile, leaderboard entries link to profiles
- **M002 PR data** — PRs feed into exercise leaderboards
- **M001 workout/set data** — All metrics computed from workout data
- **Convex cron jobs** — May need periodic leaderboard snapshot jobs

## Open Questions

- **Leaderboard update strategy** — Realtime (recompute on every qualifying set) or periodic (snapshot every N minutes)? Realtime is ideal but expensive.
- **Bodyweight class divisions** — Standard powerlifting classes, or custom brackets? Need user bodyweight data (new field).
- **Badge retroactivity** — When a badge is added, do existing users who already qualify earn it retroactively?
