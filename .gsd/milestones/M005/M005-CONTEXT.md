# M005: Collaborative Workouts — Context

**Gathered:** 2026-03-11
**Status:** Awaiting M004 completion

## Project Description

Add the ability for users to train together in realtime — start a shared workout session that multiple participants join, see each other's sets as they're logged live, share a synchronized rest timer, and track presence (who's actively working out vs. idle).

## Why This Milestone

This is the marquee differentiator. Most workout apps are solo tools. Collaborative live workouts let training partners stay in sync even when not physically together — remote gym buddies, coach-athlete pairs, or group training. Convex's realtime subscriptions make this technically feasible without a separate WebSocket layer.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Start a "group workout" and invite friends (or share a join link)
- See all participants' sets appear in realtime as they log them
- Share a synchronized rest timer that all participants see
- See who's actively in the session (realtime presence indicators)
- View a combined session summary when the group workout ends

### Entry point / environment

- Entry point: "Start Group Workout" button in workout creation flow (both platforms)
- Environment: local dev and production (multiple devices/browsers needed for testing)
- Live dependencies involved: Convex (realtime subscriptions, presence), Clerk (auth)

## Completion Class

- Contract complete means: Session creation, joining, set broadcasting, presence tracking, and session completion all work correctly
- Integration complete means: Multiple real clients see each other's activity in realtime with <2 second latency
- Operational complete means: A session with 5+ participants remains responsive and synced

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- User A starts a group workout. User B joins via invite link. Both see each other's names and presence.
- User A logs a set. User B sees it appear within 2 seconds.
- The shared rest timer counts down in sync on both screens (within ~1 second drift).
- User B closes the app. User A sees their presence indicator change to "idle" within 10 seconds.
- The session ends and both users see a combined summary.

## Risks and Unknowns

- **Presence detection** — Convex doesn't have built-in presence. Need a heartbeat pattern (periodic mutation) with expiry detection. This adds write load proportional to active participants.
- **Timer synchronization** — Shared timer must be server-authoritative to stay in sync. Client-side timers will drift. Timer state stored in Convex, clients render based on server timestamp.
- **Session state complexity** — A shared session has lifecycle states (waiting, active, complete) and multiple participants each with their own workout state. Modeling this cleanly in Convex without race conditions requires careful schema design.
- **Multi-device testing** — Verifying realtime collaboration requires multiple simultaneous clients. Automated testing is harder than single-user flows.

## Existing Codebase / Prior Art

- M001 workout logging — Group workouts extend the individual workout model
- M001 rest timer — Shared timer extends the individual timer concept
- M003 social/follow — Invitation flow may reuse the social graph
- Convex realtime subscriptions — The core technology enabling this feature

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R021 — Collaborative live workouts

## Scope

### In Scope

- Group workout session creation and invitation (link + in-app invite)
- Session lifecycle (waiting for participants → active → complete)
- Realtime broadcast of all participants' sets
- Synchronized server-authoritative rest timer
- Presence detection via heartbeat (active, idle, disconnected)
- Combined session summary at completion
- Cross-platform UI for group workout features

### Out of Scope / Non-Goals

- Voice/video chat during sessions
- AI coaching during group workouts
- Spectator mode (non-participating viewers)
- More than ~10 participants per session (optimize for small groups)

## Technical Constraints

- Presence requires periodic writes to Convex (heartbeat every 5-10 seconds per participant)
- Timer must be server-authoritative (stored in Convex, rendered client-side from server timestamp)
- Session state machine must handle concurrent mutations from multiple participants safely
- Convex's optimistic updates may cause brief visual inconsistencies in collaborative views — need to handle gracefully

## Integration Points

- **M001 workout system** — Group workouts create individual workout records for each participant
- **M001 rest timer** — Shared timer concept extends individual timer
- **M003 social** — Invitation flow, participant discovery via follow graph
- **Convex realtime** — Core technology — every query in a session is a live subscription

## Open Questions

- **Session data model** — One shared document per session with embedded participant state, or separate documents per participant linked to a session? Separate documents may reduce write contention.
- **Presence heartbeat frequency** — 5 seconds (responsive but more writes) vs. 10 seconds (fewer writes but slower detection)?
- **Late join** — Can a user join a session already in progress? Probably yes, but they'd see ongoing workout state mid-stream.
- **Participant limit** — Hard cap at 10? Or soft cap with degraded experience warning?
