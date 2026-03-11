# M005: Collaborative Workouts — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M004 completion

## Project Description

Adds live collaborative workout sessions — multiple users can join a shared workout session, see each other's sets logged in realtime, share a rest timer, and track presence. The marquee differentiator feature: training partners stay in sync even when not physically together.

## Why This Milestone

This is the "wow" feature that distinguishes the app from competitors. Most workout trackers are solo tools. Collaborative sessions create a shared experience that mimics the energy of training with a partner — driving both engagement and retention through social obligation.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Start a collaborative workout session and invite friends (via link or in-app)
- See all participants' names and presence status (active, idle, completed)
- Watch sets appear in realtime as each participant logs them
- Share a synchronized rest timer that all participants see
- View a post-workout summary comparing all participants' performance
- Continue logging sets even if another participant disconnects (graceful degradation)

### Entry point / environment

- Entry point: "Start Collab Workout" action in workout creation flow, invite link
- Environment: local dev, both platforms, minimum 2 concurrent users
- Live dependencies involved: Convex (realtime subscriptions, presence)

## Completion Class

- Contract complete means: Session data model handles multiple participants, set attribution is correct, presence heartbeat works
- Integration complete means: Two users on different devices (or different platforms) see each other's sets appear in realtime
- Operational complete means: A 30-minute collaborative workout session works without data loss, disconnection handling is graceful

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User A (mobile) starts a collaborative session. User B (web) joins via invite link. Both see each other's names. User A logs a set — it appears on User B's screen within 2 seconds. User B logs a set — User A sees it. Both see a shared rest timer.
- User B closes their browser mid-workout. User A's session continues uninterrupted. User B reopens and rejoins — their previous sets are still there.
- Post-workout summary shows both participants' complete data side by side.

## Risks and Unknowns

- **Realtime presence in Convex** — Convex doesn't have native presence. Need to implement via heartbeat writes to a presence table, with a cleanup mechanism for stale entries. This is the biggest technical risk.
- **Conflict resolution** — Two users logging sets simultaneously shouldn't conflict, but shared state (rest timer, exercise order) needs a clear ownership model.
- **Session lifecycle** — What happens when the host leaves? Does the session end, or can it continue? Need clear rules.
- **Cross-platform invite flow** — Deep links from web to mobile and vice versa for session invites require platform-specific handling.
- **Scale** — How many simultaneous participants can a session support? Convex subscription fan-out per session needs to be tested.

## Existing Codebase / Prior Art

- M001 delivers: workout logging infrastructure — collaborative sessions build on the same set logging mechanics
- M003 delivers: follow system — invite targets come from friends list
- Convex realtime subscriptions — already used throughout the app, but presence is new

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R021 — Collaborative live workouts (primary: S01, S02)

## Scope

### In Scope

- Collaborative workout session creation and joining
- Invite via link and in-app friend selection
- Realtime set visibility across all participants
- Shared rest timer
- Presence indicators (active, idle, disconnected)
- Graceful disconnection handling (rejoin without data loss)
- Post-workout comparison summary
- Both platforms (web + mobile)
- Session lifecycle rules (host departure, timeout)

### Out of Scope / Non-Goals

- Voice/video chat during workouts
- AI-powered workout suggestions
- Automated partner matching
- Workout programming for groups (coach mode)
- More than ~10 participants per session (practical limit)

## Technical Constraints

- Presence requires periodic heartbeat writes — need to balance frequency (freshness) vs write costs
- Session state must handle concurrent writes from multiple participants
- Invite links need to work cross-platform (web URL that opens mobile app if installed)
- Cleanup of abandoned sessions needs a scheduled function or TTL mechanism

## Integration Points

- **Convex realtime** — Core of the entire feature. Every participant subscribes to session data.
- **Convex scheduled functions** — Clean up stale sessions and presence entries
- **M003 follow system** — "Invite friends" pulls from follower list
- **M001 workout system** — Collaborative sessions create real workouts in each participant's history
- **Deep links** — Expo deep linking for mobile invite handling

## Open Questions

- **Session data model** — Separate session table that references individual workouts per participant? Or a shared workout with multi-user attribution? Leaning toward: session table + individual workouts linked by sessionId.
- **Presence heartbeat interval** — Every 5s? 10s? 30s? Tradeoff between freshness and Convex write volume.
- **Host privileges** — Can only the host add/remove exercises, or can any participant? Leaning toward any participant can add exercises to their own workout within the session.
- **Max session duration** — Auto-end after N hours? Or manual only? Need cleanup for abandoned sessions.
