# M003: Social Foundation — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M002 completion

## Project Description

Adds the social layer to the workout app — user profiles with public stats, a follow system, realtime activity feed, workout sharing, and community exercise sharing. Transforms a solo tracking tool into a connected fitness community.

## Why This Milestone

Social accountability is a proven retention driver for fitness apps. Users who see friends working out are more likely to work out themselves. Sharing and following creates network effects that grow the user base organically.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Set up a public profile with display name, avatar, bio, and auto-computed stats (total workouts, streak, favorite exercises)
- Follow other users and see their completed workouts in a realtime activity feed
- React to friends' workouts (fire emoji, fist bump, etc.)
- Share a workout summary to their feed or via a shareable public link
- Clone a shared workout as a personal template
- Publish custom exercises to a community library and import others' exercises
- Control privacy: mark individual workouts as private (not shown in feed)

### Entry point / environment

- Entry point: Profile and social tabs in both web and mobile apps
- Environment: local dev, both platforms
- Live dependencies involved: Convex (data, realtime), Clerk (auth, user identity)

## Completion Class

- Contract complete means: Profile, follow, feed, and sharing data models are correct; privacy controls gate data access
- Integration complete means: Following a user produces feed items in realtime; shared workout links resolve publicly; community exercises are importable
- Operational complete means: Two users can follow each other, log workouts, and see each other's activity in realtime

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User A follows User B. User B completes a workout. User A sees it appear in their feed within seconds.
- User A shares a workout via link. An unauthenticated visitor can view the workout summary at that link.
- User A clones a shared workout as a template and starts a new workout from it.
- User A marks a workout as private; it does not appear in any follower's feed.

## Risks and Unknowns

- **Feed scalability** — Fan-out on write vs fan-out on read. Convex's reactive queries favor read-time composition, but feed queries for users following many people could be slow.
- **Privacy model complexity** — Per-workout privacy, blocking, and eventually reporting add authorization complexity to every query.
- **Community exercise moderation** — Publishing exercises to a shared library requires quality control to prevent garbage data.
- **Profile data sync with Clerk** — Display name and avatar may come from Clerk or be overridden in Convex. Need a clear source-of-truth policy.

## Existing Codebase / Prior Art

- M001 delivers: workouts, exercises, templates — the content users share
- M002 delivers: PR data, analytics — stats shown on profiles
- Clerk provides: user identity, avatar, email — baseline profile data

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R015 — User profiles (primary: S01)
- R016 — Follow system and activity feed (primary: S02)
- R017 — Workout sharing (primary: S03)
- R025 — Community exercise library (deferred → activated in this milestone)

## Scope

### In Scope

- User profile creation and display (name, avatar, bio, stats)
- Follow/unfollow system
- Realtime activity feed (workouts from followed users)
- Reactions on feed items
- Workout sharing (to feed + public link)
- Clone shared workout as template
- Community exercise library (publish, browse, import)
- Per-workout privacy toggle
- Both platforms (web + mobile)

### Out of Scope / Non-Goals

- Direct messaging
- Groups/teams
- Leaderboards (M004)
- Challenges (M004)
- Content reporting/moderation beyond basic (just exercise quality)

## Technical Constraints

- Feed must be realtime via Convex subscriptions
- Privacy controls must be enforced server-side in Convex query handlers
- Public share links need a web route accessible without auth
- Community exercises need a review/quality gate before appearing in search

## Integration Points

- **Clerk** — User identity for profile seeding (name, avatar, email)
- **M001 workouts** — Source data for sharing and feed items
- **M001 templates** — Clone-as-template flow
- **M002 analytics** — Stats displayed on profile (total workouts, PRs, streak)

## Open Questions

- **Feed architecture** — Pre-compute feed items (fan-out on write) or compose at read time? Convex's reactive model makes read-time composition natural but could be slow for popular users.
- **Avatar storage** — Use Clerk avatar, or allow custom upload via Convex file storage?
- **Community exercise approval** — Auto-publish or moderator-approved? Auto-publish with community flagging is simpler but riskier.
