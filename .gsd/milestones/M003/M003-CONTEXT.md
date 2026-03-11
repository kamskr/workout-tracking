# M003: Social Foundation — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M002 completion

## Project Description

Add social features to the workout app: user profiles with public workout stats, a follow system, a realtime activity feed showing workouts from followed users with reactions, and the ability to share workouts (including cloneable templates) via links or the in-app feed.

## Why This Milestone

Solo workout tracking is valuable but retention plateaus. Social accountability — seeing friends train, getting reactions, sharing PRs — is a proven driver of long-term engagement in fitness apps. M003 transforms the app from a personal tool into a community.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Set up a profile with display name, avatar, and bio that other users can view
- Follow other users and see their completed workouts in a realtime activity feed
- React to friends' workouts (fire emoji, fist bump, etc.)
- Share a workout summary to the feed or via a public link
- Clone a shared workout as a personal template

### Entry point / environment

- Entry point: Profile tab, Feed tab (both platforms), public share links (web)
- Environment: local dev and production
- Live dependencies involved: Convex (realtime DB), Clerk (auth, user metadata)

## Completion Class

- Contract complete means: Profile, follow, feed, share, and reaction data models work correctly. Privacy controls respected.
- Integration complete means: Workout completion triggers feed item creation. Reactions update in realtime. Shared links resolve to readable workout summaries.
- Operational complete means: Feed remains performant with 50+ followed users posting regularly.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User A follows User B. User B completes a workout. User A sees it in their feed within seconds.
- User A reacts to User B's workout. User B sees the reaction in realtime.
- User B shares a workout via link. A non-authenticated user can view the summary. An authenticated user can clone it as a template.
- A user marks a workout as private. It does NOT appear in any feed or public share.

## Risks and Unknowns

- **Feed scalability** — A user following 100+ people needs an efficient feed query. Fan-out-on-write vs. fan-out-on-read trade-off.
- **Privacy model** — Need clear defaults (public vs. private workouts) and easy toggles. Getting this wrong erodes trust.
- **Community exercise library** — Deferred requirement (R025) but social features create the foundation. Should the data model anticipate this?
- **Moderation** — Public profiles and shared content need at least basic moderation (report, block).

## Existing Codebase / Prior Art

- M001 workout data model — feed items derive from completed workouts
- M001 templates — cloning shared workouts reuses template system
- M002 PR data — PR badges on shared workouts come from M002 analytics
- Clerk user data — display name, avatar may come from Clerk or be stored separately in Convex

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R015 — User profiles
- R016 — Follow system and activity feed
- R017 — Workout sharing
- R025 — Community exercise library (deferred, but social lays groundwork)

## Scope

### In Scope

- User profile creation and editing (name, avatar, bio, public stats)
- Follow / unfollow users
- Realtime activity feed (workouts from followed users)
- Reactions on feed items
- Workout sharing (to feed + public link)
- Clone shared workout as template
- Privacy controls (public/private per workout, profile visibility)
- Basic moderation (report, block)

### Out of Scope / Non-Goals

- Leaderboards (M004)
- Challenges (M004)
- Direct messaging
- Community exercise library publishing (deferred)
- Push notifications for social activity (can be added later)

## Technical Constraints

- Feed must be realtime via Convex subscriptions
- Public share links must work for unauthenticated users (public Convex queries)
- Profile data stored in Convex (not just Clerk) for app-level customization
- Must not expose private workout data through any query

## Integration Points

- **M001 templates** — Cloning shared workouts creates templates
- **M002 analytics** — PR badges and stats displayed on profiles and shared workouts
- **Clerk** — Initial profile data (name, avatar) can be seeded from Clerk identity

## Open Questions

- **Feed architecture** — Fan-out-on-write (pre-compute each user's feed) vs. fan-out-on-read (query followed users' recent workouts at read time)? Convex's realtime nature may favor fan-out-on-read for simplicity.
- **Avatar storage** — Use Clerk's avatar URL, Convex file storage, or an external service?
